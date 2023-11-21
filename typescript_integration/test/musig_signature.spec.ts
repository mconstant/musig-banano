import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;

import {
  set_addresses,
  get_addresses,
  musig_aggregated_address,
  set_message_to_sign,
  musig_start_ceremony,
  ceremony_state,
  musig_advance_ceremony,
  input_to_share
} from '../src/banano_musig_ceremony';
import {
  set_addresses2,
  get_addresses2,
  musig_aggregated_address2,
  set_message_to_sign2,
  musig_start_ceremony2,
  ceremony_state2,
  input_to_share2,
  musig_advance_ceremony2
} from '../src/banano_musig_ceremony2';
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
  this.timeout(20000);
  it("verifies signature from two addresses", async () => {
    console.log("musig...")
    const two_addresses = two_account_infos.map((account_info: IAccountInfo) => {
      return account_info.address
    });
    set_addresses(two_addresses);
    set_addresses2(two_addresses);
    console.log("set_addresses2!")
    expect(get_addresses()).to.be.equal(two_addresses);
    expect(get_addresses2()).to.be.equal(two_addresses);
    const aggregate_status: (IMusigSuccess<string> | IMusigError) = musig_aggregated_address();
    const aggregate_status2: (IMusigSuccess<string> | IMusigError) = musig_aggregated_address2();
    let aggregated_address;
    if (aggregate_status.status === 'ok' && aggregate_status2.status === 'ok') {
      aggregated_address = aggregate_status.value;
      expect(aggregated_address).to.be.equal(expected_two_addresses_aggregated);
    } else {
      throw Error('aggregation failure');
    }

    set_message_to_sign("0000000000000000000000000000000000000000000000000000000000000000");
    set_message_to_sign2("0000000000000000000000000000000000000000000000000000000000000000");

    console.log(`musig_start_ceremony... ${two_account_infos[0].private_key}`)
    musig_start_ceremony(two_account_infos[0].private_key);
    console.log("musig_start_ceremony2...")
    musig_start_ceremony2(two_account_infos[1].private_key);
    console.log("musig_start_ceremony!")

    console.log(`state1: ${ceremony_state()}`);
    console.log(`state2: ${ceremony_state2()}`);

    let _input_to_share1 = input_to_share();
    let _input_to_share2 = input_to_share2();

    console.log(`_input_to_share1: ${_input_to_share2}`);
    console.log(`_input_to_share2: ${_input_to_share2}`);

    let _input_to_share11 = musig_advance_ceremony(_input_to_share2);
    let _input_to_share22 = musig_advance_ceremony2(_input_to_share1);

    let _input_to_share111 = musig_advance_ceremony(_input_to_share22);
    let _input_to_share222 = musig_advance_ceremony2(_input_to_share11);

    let _signature1 = musig_advance_ceremony(_input_to_share222);
    let _signature2 = musig_advance_ceremony2(_input_to_share111);

    console.log(`_signature1`, _signature1);
    console.log(`_signature2`, _signature2);

    expect(ceremony_state()).toBe('succeeded');
    expect(ceremony_state2()).toBe('succeeded');
  })
});
