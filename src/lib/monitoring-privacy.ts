/** Explicit opt-out from SDK 11's data collection defaults. */
export const monitoringDataCollection = {
  userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] as [], urlQueryParams: false,
  databaseQueryData: false, queues: false, stackFrameVariables: false, frameContextLines: 0,
  graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false }, mcp: { inputs: false, outputs: false },
};
