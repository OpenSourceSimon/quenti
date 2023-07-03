import React from "react";
import { useAuthedSet } from "../hooks/use-set";
import type { StudiableTerm } from "../interfaces/studiable-term";
import {
  createLearnStore,
  LearnContext,
  type LearnStore,
} from "../stores/use-learn-store";

export const CreateLearnData: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { terms, container } = useAuthedSet();

  const storeRef = React.useRef<LearnStore>();
  if (!storeRef.current) {
    storeRef.current = createLearnStore();

    const studiable = container.studiableTerms.filter((s) => s.mode == "Learn");

    let learnTerms: StudiableTerm[] = terms
      .map((term) => {
        const studiableTerm = studiable.find((s) => s.id === term.id);
        return {
          ...term,
          correctness: studiableTerm?.correctness ?? 0,
          appearedInRound: studiableTerm?.appearedInRound ?? undefined,
          incorrectCount: studiableTerm?.incorrectCount ?? 0,
          studiableRank: studiableTerm?.studiableRank,
        };
      })
      .sort((a, b) =>
        a.studiableRank && b.studiableRank
          ? a.studiableRank - b.studiableRank
          : a.rank - b.rank
      );

    if (container.studyStarred) {
      learnTerms = learnTerms.filter((x) =>
        container.starredTerms.includes(x.id)
      );
    }
    if (container.learnMode == "Review") {
      learnTerms = learnTerms
        .filter((x) => x.incorrectCount > 0)
        .sort((a, b) => b.incorrectCount - a.incorrectCount);
    }

    storeRef.current
      .getState()
      .initialize(
        container.learnMode,
        container.answerWith,
        learnTerms,
        terms,
        container.learnRound
      );
  }

  return (
    <LearnContext.Provider value={storeRef.current}>
      {children}
    </LearnContext.Provider>
  );
};
