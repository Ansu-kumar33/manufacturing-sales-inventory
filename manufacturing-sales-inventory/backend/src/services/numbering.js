// Generates human readable document numbers such as ENQ-1004, QT-2003, SO-3001, DSP-4001.
// `client` can be the prisma client or a transaction client.

async function nextNumber(client, model, field, prefix, startFrom) {
  const last = await client[model].findFirst({
    orderBy: { id: "desc" },
    select: { [field]: true },
  });

  if (!last || !last[field]) {
    return `${prefix}-${startFrom}`;
  }

  const parts = String(last[field]).split("-");
  const lastNumber = Number(parts[parts.length - 1]);
  const next = Number.isNaN(lastNumber) ? startFrom : lastNumber + 1;
  return `${prefix}-${next}`;
}

const nextEnquiryNo = (c) => nextNumber(c, "enquiry", "enquiryNo", "ENQ", 1001);
const nextQuotationNo = (c) => nextNumber(c, "quotation", "quotationNo", "QT", 2001);
const nextOrderNo = (c) => nextNumber(c, "salesOrder", "orderNo", "SO", 3001);
const nextDispatchNo = (c) => nextNumber(c, "dispatch", "dispatchNo", "DSP", 4001);

module.exports = {
  nextEnquiryNo,
  nextQuotationNo,
  nextOrderNo,
  nextDispatchNo,
};
