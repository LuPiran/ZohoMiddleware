export function parseZohoCreateResponse(responseData) {
  const first = responseData?.data?.[0] || null;
  const status = first?.status || null;
  const recordId = first?.details?.id || null;
  const code = first?.code || null;
  const message = first?.message || responseData?.message || null;

  const confirmed = Boolean(
    first &&
      status === "success" &&
      code === "SUCCESS" &&
      typeof recordId === "string" &&
      recordId.trim().length > 0,
  );

  return {
    confirmed,
    status,
    code,
    message,
    recordId,
    raw: first,
  };
}
