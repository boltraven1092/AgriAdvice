import { enMessages } from "./en";

export function createMessages(overrides?: Partial<typeof enMessages>): typeof enMessages {
  return {
    ...enMessages,
    ...overrides,
  };
}
