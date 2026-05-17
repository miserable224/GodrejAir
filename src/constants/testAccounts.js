/**
 * Dummy accounts for local testing (seeded by SecurityOps API on startup).
 * Restart the API after pulling so missing users are created.
 */
export const TEST_LOGIN = {
  resident: {
    label: 'Resident',
    username: 'demo',
    password: 'demo123',
    hint: 'demo / demo123',
  },
  admin: {
    label: 'Admin',
    username: 'testadmin',
    password: 'testadmin123',
    hint: 'testadmin / testadmin123',
  },
};
