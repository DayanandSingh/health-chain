/**
 * Returns a doctor's display name with "Dr. " prefix, avoiding double-prefixing.
 * If the stored name already starts with Dr / Dr. / Doctor (case-insensitive),
 * it is returned unchanged. Otherwise "Dr. " is prepended.
 */
function drName(name) {
  if (!name) return name || "";
  if (/^(dr\.?\s|doctor\s)/i.test(name.trim())) return name;
  return `Dr. ${name}`;
}

module.exports = { drName };
