import { singleIdServerSideProps as getServerSideProps } from "../../common/server-side-props";
import type { ComponentWithAuth } from "../../components/auth-component";
import { ShareResolver as InternalShareResolver } from "../../components/share-resolver";

const ShareResolver: ComponentWithAuth = () => {
  return <InternalShareResolver />;
};

ShareResolver.authenticationEnabled = true;

export default ShareResolver;
export { getServerSideProps };
