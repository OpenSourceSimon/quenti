import {
  Flex,
  HStack,
  IconButton,
  Stack,
  Switch,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { IconDice5 } from "@tabler/icons-react";
import React from "react";
import { useSet } from "../../../hooks/use-set";
import { useExperienceContext } from "../../../stores/use-experience-store";
import { useSetPropertiesStore } from "../../../stores/use-set-properties-store";
import { api } from "../../../utils/api";

export const ShuffleLearnSection = () => {
  const { id } = useSet();

  const [reshuffle, setReshuffle] = React.useState(false);
  const reshuffleRef = React.useRef(reshuffle);
  reshuffleRef.current = reshuffle;

  const setIsDirty = useSetPropertiesStore((s) => s.setIsDirty);
  const shuffleLearn = useExperienceContext((s) => s.shuffleLearn);
  const setShuffleLearn = useExperienceContext((s) => s.setShuffleLearn);

  const apiShuffleLearn = api.experience.setShuffleLearn.useMutation({
    onSuccess: () => {
      if (reshuffleRef.current === true) setIsDirty(true);
      setReshuffle(false);
    },
  });

  const mutedColor = useColorModeValue("gray.600", "gray.400");

  return (
    <Flex gap={{ base: 4, sm: 8 }} flexDir={{ base: "column", sm: "row" }}>
      <Stack spacing={0} w="full">
        <Text fontWeight={700}>Study shuffled</Text>
        <Text fontSize="sm" color={mutedColor}>
          Shuffle the order of terms when studying
        </Text>
      </Stack>
      <HStack spacing={3}>
        <Switch
          size="lg"
          isChecked={shuffleLearn}
          onChange={(e) => {
            setShuffleLearn(e.target.checked);
            apiShuffleLearn.mutate({
              studySetId: id,
              shuffleLearn: e.target.checked,
            });
          }}
        />
        <Tooltip label="Reshuffle">
          <IconButton
            isLoading={reshuffle}
            variant="outline"
            size="sm"
            aria-label="Reshuffle"
            isDisabled={!shuffleLearn}
            rounded="full"
            icon={<IconDice5 size={18} />}
            onClick={() => {
              setReshuffle(true);

              apiShuffleLearn.mutate({
                studySetId: id,
                shuffleLearn: true,
              });
            }}
          />
        </Tooltip>
      </HStack>
    </Flex>
  );
};
