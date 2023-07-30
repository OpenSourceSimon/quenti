import {
  Box,
  Button,
  HStack,
  Input,
  InputGroup,
  InputRightAddon,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import React, { useImperativeHandle } from "react";
import { USERNAME_REGEXP } from "../constants/characters";
import { useDebounce } from "../hooks/use-debounce";
import { api } from "../utils/api";
import { AnimatedCheckCircle } from "./animated-icons/check";
import { AnimatedXCircle } from "./animated-icons/x";

export interface ChangeUsernameInputProps {
  showButton?: boolean;
  buttonLabel?: string;
  disabledIfUnchanged?: boolean;
  onChange?: () => void;
  onActionStateChange?: (disabled: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const ChangeUsernameInput = React.forwardRef<
  { mutate: () => void },
  ChangeUsernameInputProps
>(
  (
    {
      showButton = true,
      buttonLabel = "Save",
      disabledIfUnchanged = true,
      onChange,
      onActionStateChange,
      onLoadingChange,
    },
    ref
  ) => {
    const session = useSession();

    const inputBg = useColorModeValue("gray.100", "gray.750");
    const addonBg = useColorModeValue("gray.200", "gray.700");
    const borderColor = useColorModeValue("gray.300", "gray.600");

    const [usernameValue, setUsernameValue] = React.useState(
      session.data!.user!.username
    );
    const debouncedUsername = useDebounce(usernameValue, 500);

    const checkUsername = api.user.checkUsername.useQuery(
      { username: debouncedUsername },
      {
        enabled: !!debouncedUsername.length,
      }
    );
    const changeUsername = api.user.changeUsername.useMutation({
      onSuccess: () => onChange?.(),
    });

    const gray = useColorModeValue("gray.500", "gray.400");
    const green = useColorModeValue("green.400", "green.300");
    const red = useColorModeValue("red.400", "red.300");

    const isProfane = checkUsername.data?.isProfane;
    const isTooLong = usernameValue.length > 40;
    const isTaken = checkUsername.data?.available === false;
    const isInvalid =
      !USERNAME_REGEXP.test(usernameValue) || isProfane || isTooLong;

    useImperativeHandle(
      ref,
      () => {
        return {
          mutate: () => {
            changeUsername.mutate({ username: usernameValue });
          },
        };
      },
      [changeUsername, usernameValue]
    );

    const isDisabled =
      isInvalid ||
      checkUsername.isLoading ||
      debouncedUsername !== usernameValue ||
      !checkUsername.data?.available ||
      (disabledIfUnchanged && usernameValue === session.data!.user!.username);

    React.useEffect(() => {
      onActionStateChange?.(isDisabled);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDisabled]);

    React.useEffect(() => {
      onLoadingChange?.(changeUsername.isLoading);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [changeUsername.isLoading]);

    return (
      <Stack gap={2} w="full">
        <HStack gap={2}>
          <Box
            w="full"
            rounded="md"
            borderWidth="0"
            borderBottomWidth="2px"
            overflow="hidden"
            transition="border-color 0.2s ease-in-out"
            borderColor={borderColor}
            _focusWithin={{
              borderColor: isInvalid ? "red.300" : "blue.300",
            }}
          >
            <InputGroup size="lg" rounded="md" background={borderColor}>
              <Input
                fontWeight={700}
                variant="unstyled"
                placeholder="Enter a username"
                bg={inputBg}
                spellCheck={false}
                disabled={changeUsername.isLoading}
                px="4"
                style={{
                  border: "0px",
                  outline: "0px",
                }}
                value={usernameValue}
                onChange={(e) => {
                  if (!changeUsername.isLoading)
                    setUsernameValue(e.target.value);
                }}
                isInvalid={isInvalid}
                className="highlight-block"
              />
              <InputRightAddon
                bg={addonBg}
                px="3"
                rounded="none"
                border="0"
                color={
                  checkUsername.isLoading
                    ? gray
                    : checkUsername.data?.available
                    ? green
                    : red
                }
              >
                {checkUsername.isLoading && !isInvalid ? (
                  <Box w="24px" />
                ) : checkUsername.data?.available ? (
                  <AnimatedCheckCircle />
                ) : (
                  <AnimatedXCircle />
                )}
              </InputRightAddon>
            </InputGroup>
          </Box>
          {showButton && (
            <Button
              size="lg"
              isDisabled={isDisabled}
              onClick={() => changeUsername.mutate({ username: usernameValue })}
              isLoading={changeUsername.isLoading}
            >
              {buttonLabel}
            </Button>
          )}
        </HStack>
        <Text
          fontSize="sm"
          textAlign="left"
          color={gray}
          visibility={isInvalid || isTaken ? "visible" : "hidden"}
        >
          {isTooLong
            ? "Username must be 40 characters or less."
            : isProfane
            ? "Profane usernames are not allowed."
            : isTaken
            ? "That username has already been taken."
            : "Only letters, numbers, underscores and dashes allowed."}
        </Text>
      </Stack>
    );
  }
);

ChangeUsernameInput.displayName = "ChangeUsernameInput";
