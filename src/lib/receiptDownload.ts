// Client helper: fetches a transfer receipt PDF from the authenticated
// endpoint and hands it to the browser as a file download. Throws with the
// server's message so callers can surface it.

export async function downloadTransferReceipt(params: { id?: string; reference?: string }): Promise<void> {
  const qs = new URLSearchParams();
  if (params.id) qs.set("id", params.id);
  else if (params.reference) qs.set("reference", params.reference);
  else throw new Error("Missing transfer reference");

  const res = await fetch(`/api/transfers/receipt?${qs.toString()}`);
  if (!res.ok) {
    let message = "Failed to download receipt";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `Aldwych-Transfer-Receipt-${params.reference || params.id}.pdf`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
