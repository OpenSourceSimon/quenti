import {
  Button,
  Collapse,
  Menu,
  MenuButton,
  MenuDivider,
  MenuList,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  IconBooks,
  IconChevronDown,
  IconCloudDownload,
  IconFolder,
} from "@tabler/icons-react";
import { signIn, useSession } from "next-auth/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React from "react";
import { Link } from "../link";
import { MenuOption } from "../menu-option";
import { MobileUserOptions } from "./mobile-user-options";

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderClick: () => void;
  onImportClick: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onFolderClick,
  onImportClick,
}) => {
  const router = useRouter();
  React.useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  const { data: session, status } = useSession()!;
  const bgGradient = useColorModeValue(
    "linear(to-b, gray.50, white)",
    "linear(to-b, gray.900, gray.800)"
  );
  const menuBg = useColorModeValue("white", "gray.800");

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <Collapse in={isOpen}>
      <Stack
        pos="absolute"
        insetX={0}
        bgGradient={bgGradient}
        px="6"
        py="10"
        spacing={8}
      >
        <Stack spacing={4}>
          {session?.user && (
            <Button
              variant="outline"
              colorScheme="gray"
              fontWeight={700}
              fontSize="sm"
              onClick={async () => {
                onClose();
                await router.push("/home");
              }}
            >
              Home
            </Button>
          )}
          {session?.user?.admin && (
            <Button
              variant="outline"
              colorScheme="gray"
              fontWeight={700}
              fontSize="sm"
              onClick={async () => {
                onClose();
                await router.push("/admin");
              }}
            >
              Admin
            </Button>
          )}
          {session?.user && (
            <Menu
              boundary="scrollParent"
              placement="bottom"
              isOpen={menuOpen}
              onOpen={() => setMenuOpen(true)}
              onClose={() => setMenuOpen(false)}
            >
              <MenuButton>
                <Button
                  w="full"
                  fontWeight={700}
                  fontSize="sm"
                  rightIcon={
                    <IconChevronDown
                      style={{
                        transition: "rotate ease-in-out 200ms",
                        rotate: menuOpen ? "180deg" : "0deg",
                      }}
                    />
                  }
                  as="div"
                >
                  Create
                </Button>
              </MenuButton>
              <MenuList
                bg={menuBg}
                py={0}
                overflow="hidden"
                w="calc(100vw - 48px)"
              >
                <NextLink href="/create" passHref>
                  <MenuOption
                    icon={<IconBooks size={20} />}
                    label="Study set"
                    onClick={() => {
                      onClose();
                    }}
                  />
                </NextLink>
                <MenuOption
                  icon={<IconCloudDownload size={20} />}
                  label="Import from Quizlet"
                  onClick={onImportClick}
                />
                <MenuDivider />
                <MenuOption
                  icon={<IconFolder size={20} />}
                  label="Folder"
                  onClick={onFolderClick}
                />
              </MenuList>
            </Menu>
          )}
          {status !== "loading" && !session && (
            <>
              <Button
                colorScheme="blue"
                variant="outline"
                onClick={async () => {
                  await signIn("google", {
                    callbackUrl: "/home",
                  });
                }}
              >
                Log in
              </Button>{" "}
              <Button as={Link} href={"/signup"}>
                Sign up for free
              </Button>
            </>
          )}
        </Stack>
        {session?.user && <MobileUserOptions closeMenu={onClose} />}
      </Stack>
    </Collapse>
  );
};
