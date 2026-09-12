import {
  Buffer,
  defaultChainInfo,
  mainnetClient,
  roundAt,
  timelockDecrypt,
  timelockEncrypt,
} from 'tlock-js';

const MIN_FUTURE_MS = 10_000;

// tlock-js 0.9.0 works with drand's v1 quicknet URL used by mainnetClient().
// Do not switch this to the /v2/beacons/quicknet endpoint until tlock-js
// explicitly supports the v2 chain-info response shape.
const client = mainnetClient();

export interface TimelockEnvelope {
  ciphertext: string;
  round: number;
  unlockAt: string;
  encryption: 'tlock-drand-quicknet-v1';
}

export const createTimelockEnvelope = async (
  plaintext: string,
  requestedUnlockAt: string
): Promise<TimelockEnvelope> => {
  const unlockMs = new Date(requestedUnlockAt).getTime();

  if (!Number.isFinite(unlockMs)) {
    throw new Error('Thời gian mở khóa không hợp lệ.');
  }

  if (unlockMs < Date.now() + MIN_FUTURE_MS) {
    throw new Error('Thời gian mở khóa phải ở tương lai ít nhất 10 giây.');
  }

  // Use the pinned quicknet chain info bundled by tlock-js instead of
  // fetching chain-info just to calculate the round. The round itself is
  // cryptographically embedded in the ciphertext by tlock-js.
  const round = roundAt(unlockMs, defaultChainInfo);
  const ciphertext = await timelockEncrypt(
    round,
    Buffer.from(plaintext, 'utf8'),
    client
  );

  return {
    ciphertext,
    round,
    unlockAt: new Date(unlockMs).toISOString(),
    encryption: 'tlock-drand-quicknet-v1',
  };
};

export const decryptTimelockEnvelope = async (
  ciphertext: string
): Promise<string> => {
  const plaintext = await timelockDecrypt(ciphertext, client);
  return plaintext.toString('utf8');
};
