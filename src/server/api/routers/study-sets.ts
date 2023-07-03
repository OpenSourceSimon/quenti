import {
  type PrismaClient,
  type StarredTerm,
  type StudiableTerm,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  LANGUAGE_VALUES,
  MAX_CHARS_TAGS,
  MAX_DESC,
  MAX_NUM_TAGS,
  MAX_TERM,
  MAX_TITLE,
  type Language,
} from "../common/constants";
import { shortId } from "../common/generator";
import { profanity } from "../common/profanity";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const getRecentStudySets = async (
  prisma: PrismaClient,
  userId: string,
  exclude?: string[]
) => {
  const recentContainers = await prisma.container.findMany({
    where: {
      userId: userId,
      type: "StudySet",
      NOT: {
        OR: [
          {
            entityId: {
              in: exclude ?? [],
            },
          },
          {
            studySet: {
              user: {
                username: "Quizlet",
              },
            },
          },
        ],
      },
      studySet: {
        OR: [
          {
            visibility: {
              not: "Private",
            },
          },
          {
            userId: userId,
          },
        ],
      },
    },
    orderBy: {
      viewedAt: "desc",
    },
    take: 16,
  });
  const containerIds = recentContainers.map((e) => e.entityId);

  return (
    await prisma.studySet.findMany({
      where: {
        id: {
          in: containerIds,
        },
      },
      include: {
        user: true,
        _count: {
          select: {
            terms: true,
          },
        },
      },
    })
  )
    .sort((a, b) => containerIds.indexOf(a.id) - containerIds.indexOf(b.id))
    .map((set) => ({
      ...set,
      viewedAt: recentContainers.find((e) => e.entityId === set.id)!.viewedAt,
      user: {
        username: set.user.username,
        image: set.user.image!,
      },
    }));
};

export const studySetsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) => {
    const studySet = ctx.prisma.studySet.findMany({
      where: {
        userId: ctx.session?.user?.id,
      },
      include: {
        user: true,
        _count: {
          select: {
            terms: true,
          },
        },
      },
    });
    return studySet;
  }),

  recent: protectedProcedure
    .input(
      z.object({
        exclude: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getRecentStudySets(
        ctx.prisma,
        ctx.session?.user?.id,
        input.exclude
      );
    }),

  getOfficial: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.studySet.findMany({
      where: {
        user: {
          username: "Quizlet",
        },
      },
      include: {
        user: {
          select: {
            username: true,
            image: true,
          },
        },
        _count: {
          select: {
            terms: true,
          },
        },
      },
    });
  }),

  byId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const studySet = await ctx.prisma.studySet.findUnique({
      where: {
        id: input,
      },
      include: {
        user: true,
        terms: true,
      },
    });

    if (!studySet) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    if (
      studySet.visibility === "Private" &&
      studySet.userId !== ctx.session?.user?.id
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This set is private.",
      });
    }

    await ctx.prisma.container.upsert({
      where: {
        userId_entityId_type: {
          userId: ctx.session.user.id,
          entityId: input,
          type: "StudySet",
        },
      },
      create: {
        entityId: input,
        userId: ctx.session.user.id,
        viewedAt: new Date(),
        type: "StudySet",
      },
      update: {
        viewedAt: new Date(),
      },
    });

    const container = await ctx.prisma.container.findUnique({
      where: {
        userId_entityId_type: {
          userId: ctx.session.user.id,
          entityId: input,
          type: "StudySet",
        },
      },
      include: {
        starredTerms: true,
        studiableTerms: true,
      },
    });

    if (!container) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    if (!container.starredTerms.length) {
      await ctx.prisma.container.update({
        where: {
          userId_entityId_type: {
            userId: ctx.session.user.id,
            entityId: input,
            type: "StudySet",
          },
        },
        data: {
          studyStarred: false,
          cardsStudyStarred: false,
        },
      });
      container.studyStarred = false;
      container.cardsStudyStarred = false;
      container.matchStudyStarred = false;
    }

    return {
      ...studySet,
      tags: studySet.tags as string[],
      wordLanguage: studySet.wordLanguage as Language,
      definitionLanguage: studySet.definitionLanguage as Language,
      user: {
        username: studySet.user.username,
        image: studySet.user.image!,
        verified: studySet.user.verified,
      },
      container: {
        ...container,
        starredTerms: container.starredTerms.map((x: StarredTerm) => x.termId),
        studiableTerms: container.studiableTerms.map((x: StudiableTerm) => ({
          id: x.termId,
          mode: x.mode,
          correctness: x.correctness,
          appearedInRound: x.appearedInRound,
          incorrectCount: x.incorrectCount,
          studiableRank: x.studiableRank,
        })),
      },
    };
  }),

  getPublic: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const studySet = await ctx.prisma.studySet.findUnique({
      where: {
        id: input,
      },
      include: {
        user: true,
        terms: true,
      },
    });

    if (studySet?.visibility !== "Public") {
      throw new TRPCError({
        code: "FORBIDDEN",
      });
    }

    return {
      ...studySet,
      tags: studySet.tags as string[],
      wordLanguage: studySet.wordLanguage as Language,
      definitionLanguage: studySet.definitionLanguage as Language,
      user: {
        username: studySet.user.username,
        image: studySet.user.image!,
        verified: studySet.user.verified,
      },
    };
  }),

  getShareId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const studySet = await ctx.prisma.studySet.findUnique({
        where: {
          id: input,
        },
      });

      if (!studySet) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      if (
        studySet.visibility === "Private" &&
        studySet.userId !== ctx.session?.user?.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This set is private.",
        });
      }

      return (
        await ctx.prisma.entityShare.upsert({
          where: {
            entityId: input,
          },
          create: {
            entityId: input,
            id: shortId() as string,
            type: "StudySet",
          },
          update: {},
        })
      ).id;
    }),

  createFromAutosave: protectedProcedure.mutation(async ({ ctx }) => {
    const autoSave = await ctx.prisma.setAutoSave.findFirst({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        autoSaveTerms: true,
      },
    });

    if (!autoSave) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    if (!autoSave.title.trim().length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Set title is required.",
      });
    }

    await ctx.prisma.setAutoSave.delete({
      where: {
        userId: ctx.session.user.id,
      },
    });

    const tags = autoSave.tags as string[];
    const studySet = await ctx.prisma.studySet.create({
      data: {
        title: profanity.censor(autoSave.title.slice(0, MAX_TITLE)),
        description: profanity.censor(autoSave.description.slice(0, MAX_DESC)),
        tags: tags
          .slice(0, MAX_NUM_TAGS)
          .map((x) => profanity.censor(x.slice(0, MAX_CHARS_TAGS))),
        wordLanguage: autoSave.wordLanguage,
        definitionLanguage: autoSave.definitionLanguage,
        visibility: autoSave.visibility,
        userId: ctx.session.user.id,
        terms: {
          createMany: {
            data: autoSave.autoSaveTerms.map((term) => ({
              id: term.id,
              word: profanity.censor(term.word.slice(0, MAX_TERM)),
              definition: profanity.censor(term.definition.slice(0, MAX_TERM)),
              rank: term.rank,
            })),
          },
        },
      },
    });

    return studySet;
  }),

  edit: protectedProcedure
    .input(
      z
        .object({
          id: z.string(),
          title: z.string().trim().min(1),
          description: z.string(),
          tags: z.array(z.string()),
          wordLanguage: z.enum(LANGUAGE_VALUES),
          definitionLanguage: z.enum(LANGUAGE_VALUES),
          visibility: z.enum(["Public", "Unlisted", "Private"]),
        })
        .transform((z) => ({
          ...z,
          title: profanity.censor(z.title),
          description: profanity.censor(z.description.slice(0, MAX_DESC)),
          tags: z.tags
            .slice(0, MAX_NUM_TAGS)
            .map((x) => profanity.censor(x.slice(0, MAX_CHARS_TAGS))),
        }))
    )
    .mutation(async ({ ctx, input }) => {
      const studySet = await ctx.prisma.studySet.update({
        where: {
          id_userId: {
            id: input.id,
            userId: ctx.session.user.id,
          },
        },
        data: {
          title: input.title,
          description: input.description,
          tags: input.tags,
          wordLanguage: input.wordLanguage,
          definitionLanguage: input.definitionLanguage,
          visibility: input.visibility,
        },
      });

      return studySet;
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.studySet.delete({
        where: {
          id_userId: {
            id: input,
            userId: ctx.session.user.id,
          },
        },
      });
    }),
});
