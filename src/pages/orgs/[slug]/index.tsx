import { OrganizationLayout } from "../../../modules/organizations/organization-layout";
import { OrganizationPage } from "../../../modules/organizations/pages/organization-page";

const Page = () => {
  return <OrganizationPage />;
};

Page.layout = OrganizationLayout;
export default Page;
