function convertToCsv(leads) {
  const headers = ["Name", "Status", "Note", "URL", "Updated At"];

  const rows = leads.map((lead) => [
    lead.name || "",
    lead.status || "",
    lead.note || "",
    lead.url || "",
    lead.updatedAt || ""
  ]);

  const csvRows = [headers, ...rows].map((row) =>
    row
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return csvRows.join("\n");
}

function downloadCsv(csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "linkedin-leads.csv";
  link.click();

  URL.revokeObjectURL(url);
}

chrome.storage.local.get(["leads"], (result) => {
  const leads = result.leads || [];
  document.getElementById("count").textContent = leads.length;
});

document.getElementById("export").addEventListener("click", () => {
  chrome.storage.local.get(["leads"], (result) => {
    const leads = result.leads || [];
    const csv = convertToCsv(leads);
    downloadCsv(csv);
  });
});

document.getElementById("clear").addEventListener("click", () => {
  const confirmed = confirm("Delete all saved leads?");
  if (!confirmed) return;

  chrome.storage.local.set({ leads: [] }, () => {
    document.getElementById("count").textContent = "0";
  });
});