/** Rebrand the display name without changing the verified sending address. */
export function brandEmailSender(sender: string | undefined) {
  if (!sender) return sender;
  const addressStart = sender.indexOf("<");
  if (addressStart < 0) return sender;
  return sender.slice(0, addressStart).replace(/\bKadoLakay\b/gi, "Bayou") + sender.slice(addressStart);
}
