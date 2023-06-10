import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;

import {
  set_addresses,
  get_addresses,
  musig_aggregated_address
} from '../src/banano_musig_ceremony';
import { IMusigError, IMusigSuccess } from '../src/interfaces';

interface IAccountInfo {
  private_key: string,
  public_key: string,
  address: string
}

// aggregated address from two addresses
const two_account_infos: [IAccountInfo, IAccountInfo] = [
  {
    private_key: "87CD99A80C37EDF2769AD31C184DADAD14071E55EF1F396C22641543575FDFAB",
    public_key: "B723F0774F78532BFD16CA4676307B5F8B606982DF161CA8B1DC3F8D3ACC8468",
    address: "ban_3fs5y3unyy4m7hyjfkk8grr9pqwde3nr7qrp5knd5q3zjnxes35am1z59tpq"
  },
  {
    private_key: "D749BB6051151DE1DA9D65CE1090A2CD7D532FAAFA16A1C391EC6540747AED00",
    public_key: "5732FAE2FAF91E0FD913D39F248DC5F31A064DE9DA84AF9868E76F1C193A5945",
    address: "ban_1oskzdjhoyay3zej9nwz6k8wdwrt1s8ympn6oye8jsuh5iemnpc7xninp4fp"
  }
];

// Manually merged the two addresses above with `nano_` prefix in the musig-nano example github page.
// https://plasmapower.github.io/musig-nano/
const expected_two_addresses_aggregated = "ban_3u5foc15je4uow43u13ahrsnfym7xgpfpn6grc1mxj1nibukfz48azah9de6";

// aggregated address from three addresses
const three_account_infos: [IAccountInfo, IAccountInfo, IAccountInfo] = [
  {
    private_key: "87CD99A80C37EDF2769AD31C184DADAD14071E55EF1F396C22641543575FDFAB",
    public_key: "B723F0774F78532BFD16CA4676307B5F8B606982DF161CA8B1DC3F8D3ACC8468",
    address: "ban_3fs5y3unyy4m7hyjfkk8grr9pqwde3nr7qrp5knd5q3zjnxes35am1z59tpq"
  },
  {
    private_key: "D749BB6051151DE1DA9D65CE1090A2CD7D532FAAFA16A1C391EC6540747AED00",
    public_key: "5732FAE2FAF91E0FD913D39F248DC5F31A064DE9DA84AF9868E76F1C193A5945",
    address: "ban_1oskzdjhoyay3zej9nwz6k8wdwrt1s8ympn6oye8jsuh5iemnpc7xninp4fp"
  },
  {
    private_key: "A37640B880F395FA5358B5105532D7CDF90200A615E90B37E716E8DD9E8FFAA4",
    public_key: "3C34797A6F54303BF4BAFF5ED2CC3E6EA3CEA2550F350AA2342B69A51AB0BB7E",
    address: "ban_1h3nh7x8yo3i9htdoztytd85wuo5stj7c5so3cj5acubnnfd3guynnfxqqi9"
  }
];
// Manually merged the three addresses above with `nano_` prefix in the musig-nano example github page.
// https://plasmapower.github.io/musig-nano/
const expected_three_addresses_aggregated = "ban_3x1rag1nhqm6nqm5w4atq6jsefsdantnfimzq839jp58bczazj48ey1fwjod";

describe('musig_aggregated_address', function () {
  // 20 seconds timeout so I can test under poor network conditions :')
  this.timeout(20000);

  it("set_addresses matches get_addresses", async () => {
    const two_addresses = two_account_infos.map((account_info: IAccountInfo) => {
      return account_info.address
    });
    set_addresses(two_addresses);
    expect(get_addresses()).to.be.equal(two_addresses);

    const three_addresses = three_account_infos.map((account_info: IAccountInfo) => {
      return account_info.address
    });
    set_addresses(three_addresses);
    expect(get_addresses()).to.be.equal(three_addresses);
  });

  it("aggregates two addresses", async () => {
    const two_addresses = two_account_infos.map((account_info: IAccountInfo) => {
      return account_info.address
    });
    set_addresses(two_addresses);
    expect(get_addresses()).to.be.equal(two_addresses);
    const aggregate_status: (IMusigSuccess<string> | IMusigError) = musig_aggregated_address();
    if (aggregate_status.status === 'ok') {
      const aggregated_address = aggregate_status.value;
      expect(aggregated_address).to.be.equal(expected_two_addresses_aggregated);
    } else {
      throw Error(aggregate_status.message);
    }
  });

  it("aggregates three addresses", async () => {
    const three_addresses = three_account_infos.map((account_info: IAccountInfo) => {
      return account_info.address
    });
    set_addresses(three_addresses);
    expect(get_addresses()).to.be.equal(three_addresses);
    const aggregate_status: (IMusigSuccess<string> | IMusigError) = musig_aggregated_address();
    if (aggregate_status.status === 'ok') {
      const aggregated_address = aggregate_status.value;
      expect(aggregated_address).to.be.equal(expected_three_addresses_aggregated);
    } else {
      throw Error(aggregate_status.message);
    }
  });
});
