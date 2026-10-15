import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

const blocked = new BlockList()
// Bun 1.3.11 on Windows requires separate families to avoid a native mixed-family BlockList panic.
const blocked6 = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] satisfies [string, number][])
  blocked.addSubnet(network, prefix, 'ipv4')
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
] satisfies [string, number][])
  blocked6.addSubnet(network, prefix, 'ipv6')
export function publicAddress(address: string) {
  const family = isIP(address)
  return family === 4
    ? !blocked.check(address, 'ipv4')
    : family === 6 && /^[23]/i.test(address) && !blocked6.check(address, 'ipv6')
}
export async function publicAddresses(hostname: string) {
  const addresses = await lookup(hostname.replace(/^\[|\]$/g, ''), { all: true, verbatim: true })
  if (!addresses.length || addresses.some((item) => !publicAddress(item.address)))
    throw new Error('Network policy blocks private or reserved addresses')
  return addresses
}
