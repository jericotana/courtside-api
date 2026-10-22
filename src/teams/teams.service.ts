import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, DRIZZLE, type Transaction } from '../db/db.module';
import {
  gamePlayers,
  invites,
  teamMembers,
  type TeamRole,
  teams,
  users,
} from '../db/schema';
import { and, count, eq } from 'drizzle-orm';
import { MAX_TEAMS_PER_USER } from './teams.constants';
import type { MyTeam, Team, TeamMember, TeamMembership } from './team';

@Injectable()
export class TeamsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(userId: string, name: string): Promise<MyTeam> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      const [{ total }] = await tx
        .select({ total: count() })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      if (total >= MAX_TEAMS_PER_USER) {
        throw new ConflictException(
          `You can be in at most ${MAX_TEAMS_PER_USER} teams`,
        );
      }

      const [teamRow] = await tx
        .insert(teams)
        .values({ name, createdBy: userId })
        .returning();
      const [teamMembersRow] = await tx
        .insert(teamMembers)
        .values({
          teamId: teamRow.id,
          userId: userId,
          role: 'admin',
        })
        .returning();

      return { id: teamRow.id, name: teamRow.name, role: teamMembersRow.role };
    });
  }

  async findTeamsByUserId(userId: string): Promise<MyTeam[]> {
    return this.db
      .select({ id: teams.id, name: teams.name, role: teamMembers.role })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(teams.name);
  }

  async findById(id: string): Promise<Team | undefined> {
    const [row] = await this.db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.id, id));

    return row;
  }

  async findMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamMembership | undefined> {
    const [row] = await this.db
      .select({ teamId: teamMembers.teamId, role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      );

    return row;
  }

  async rename(teamId: string, name: string): Promise<Team> {
    const [row] = await this.db
      .update(teams)
      .set({ name })
      .where(eq(teams.id, teamId))
      .returning({ id: teams.id, name: teams.name });

    if (!row) {
      throw new NotFoundException('Team not found');
    }

    return row;
  }

  async findTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.db
      .select({
        userId: teamMembers.userId,
        name: users.name,
        role: teamMembers.role,
        status: users.status,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.role, users.name);
  }

  async inviteMember(teamId: string, userName: string): Promise<TeamMember> {
    return this.db.transaction(async (tx) => {
      const [userRow] = await tx
        .insert(users)
        .values({
          status: 'invited',
          name: userName,
        })
        .returning();

      const [teamMembershipRow] = await tx
        .insert(teamMembers)
        .values({
          teamId,
          userId: userRow.id,
          role: 'player',
        })
        .returning();

      return {
        userId: userRow.id,
        name: userRow.name,
        role: teamMembershipRow.role,
        status: userRow.status,
        joinedAt: teamMembershipRow.joinedAt,
      };
    });
  }

  async updateTeamMemberRole(
    teamId: string,
    userId: string,
    role: TeamRole,
  ): Promise<TeamMember> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.id, teamId))
        .for('update');

      const [member] = await tx
        .select({ role: teamMembers.role, status: users.status })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
        );
      if (!member) throw new NotFoundException('Member not found');
      if (member.status === 'invited' && role === 'admin') {
        throw new ConflictException("An invited user can't be made admin");
      }

      if (member.role === 'admin' && role === 'player') {
        await this.assertNotLastAdmin(tx, teamId);
      }

      await tx
        .update(teamMembers)
        .set({ role })
        .where(
          and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)),
        );

      const [row] = await tx
        .select({
          userId: teamMembers.userId,
          name: users.name,
          role: teamMembers.role,
          status: users.status,
          joinedAt: teamMembers.joinedAt,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
        );
      return row;
    });
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.id, teamId))
        .for('update');

      const [member] = await tx
        .select({ role: teamMembers.role, status: users.status })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
        );

      if (!member) throw new NotFoundException('Member not found');

      if (member.role === 'admin') {
        await this.assertNotLastAdmin(tx, teamId);
      }

      if (member.status === 'invited') {
        const [played] = await tx
          .select({ gameId: gamePlayers.gameId })
          .from(gamePlayers)
          .where(eq(gamePlayers.userId, userId))
          .limit(1);

        if (played) {
          // keep the user (old box scores still show "Marco"); remove membership + invite
          await tx
            .delete(teamMembers)
            .where(
              and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userId),
              ),
            );
          await tx.delete(invites).where(eq(invites.invitedUserId, userId));
        } else {
          await tx.delete(users).where(eq(users.id, userId)); // never played → delete entirely
        }
      } else {
        await tx
          .delete(teamMembers)
          .where(
            and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
          );
      }
    });
  }

  private async assertNotLastAdmin(
    tx: Transaction,
    teamId: string,
  ): Promise<void> {
    const [{ admins }] = await tx
      .select({ admins: count() })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, 'admin')),
      );
    if (admins <= 1)
      throw new ConflictException('A team needs at least one admin');
  }
}
