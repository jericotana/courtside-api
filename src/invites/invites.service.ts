import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, DRIZZLE } from '../db/db.module';
import {
  gameEvents,
  gamePlayers,
  invites,
  teamMembers,
  teams,
  users,
} from '../db/schema';
import { generateToken, hashToken } from '../common/tokens';
import { and, count, eq, gt } from 'drizzle-orm';
import { INVITE_TTL_DAYS } from './invites.constants';
import type { CreateInviteResult, PreviewInviteResult } from './invite';
import { MAX_TEAMS_PER_USER } from '../teams/teams.constants';
import type { MyTeam } from '../teams/team';

@Injectable()
export class InvitesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(
    teamId: string,
    userId: string,
    createdBy: string,
  ): Promise<CreateInviteResult> {
    const [member] = await this.db
      .select({ status: users.status })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.status !== 'invited') {
      throw new ConflictException('This player already has an account');
    }

    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const token = generateToken();
    const tokenHash = hashToken(token);

    await this.db
      .insert(invites)
      .values({
        tokenHash,
        teamId,
        invitedUserId: userId,
        createdBy,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: invites.invitedUserId,
        set: { tokenHash, createdBy, expiresAt },
      });

    return { token, expiresAt };
  }

  async preview(token: string): Promise<PreviewInviteResult> {
    const tokenHash = hashToken(token);
    const [invite] = await this.db
      .select({
        teamName: teams.name,
        playerName: users.name,
        expiresAt: invites.expiresAt,
      })
      .from(invites)
      .innerJoin(teams, eq(teams.id, invites.teamId))
      .innerJoin(users, eq(users.id, invites.invitedUserId))
      .where(
        and(
          gt(invites.expiresAt, new Date()),
          eq(invites.tokenHash, tokenHash),
        ),
      );

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    return invite;
  }

  async accept(token: string, userId: string): Promise<MyTeam> {
    const tokenHash = hashToken(token);

    const [invite] = await this.db
      .select({ teamId: invites.teamId, invitedUserId: invites.invitedUserId })
      .from(invites)
      .where(
        and(
          eq(invites.tokenHash, tokenHash),
          gt(invites.expiresAt, new Date()),
        ),
      );
    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.id, invite.teamId))
        .for('update');

      const [txInvite] = await tx
        .select({
          teamId: invites.teamId,
          invitedUserId: invites.invitedUserId,
        })
        .from(invites)
        .where(
          and(
            eq(invites.tokenHash, tokenHash),
            gt(invites.expiresAt, new Date()),
          ),
        )
        .for('update');

      if (!txInvite) {
        throw new NotFoundException('Invite not found or expired');
      }

      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      const [existing] = await tx
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, txInvite.teamId),
            eq(teamMembers.userId, userId),
          ),
        );
      if (existing) throw new ConflictException("You're already in this team");

      const [membershipCount] = await tx
        .select({ total: count() })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      if (membershipCount.total >= MAX_TEAMS_PER_USER) {
        throw new ConflictException(
          `You can be in at most ${MAX_TEAMS_PER_USER} teams`,
        );
      }

      await tx
        .update(gamePlayers)
        .set({ userId })
        .where(eq(gamePlayers.userId, txInvite.invitedUserId));
      await tx
        .update(gameEvents)
        .set({ playerId: userId })
        .where(eq(gameEvents.playerId, txInvite.invitedUserId));

      const [membership] = await tx
        .update(teamMembers)
        .set({ userId })
        .where(
          and(
            eq(teamMembers.teamId, txInvite.teamId),
            eq(teamMembers.userId, txInvite.invitedUserId),
          ),
        )
        .returning({ role: teamMembers.role });

      await tx.delete(users).where(eq(users.id, txInvite.invitedUserId));

      const [team] = await tx
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.id, txInvite.teamId));
      return { id: team.id, name: team.name, role: membership.role };
    });
  }
}
