export function groupByAddress(input) {
  const result = input?.data?.reduce((acc, item) => {
    // Extract the type and address information
    const typeString = item?.data?.type;
    const addressMatch = typeString.match(/<([^>]+)>/);
    const address = addressMatch ? addressMatch[1] : null;
    const cleanedType = typeString.replace(/<[^>]+>/, "");

    if (!address) {
      return acc;
    }

    // Find or create the entry for this address
    let addressEntry = acc?.find((entry) => entry.address === address);
    if (!addressEntry) {
      addressEntry = { address, items: [] };
      acc.push(addressEntry);
    }

    // Add the item with the cleaned type to the corresponding address entry
    addressEntry.items.push({
      type: cleanedType,
      object: item.data,
    });

    return acc;
  }, []);

  return result;
}
export function filterGroupsByType(groupedData, typesToFilter) {
  return groupedData?.filter((group) =>
    group.items?.some((item) => item.type.includes(typesToFilter))
  );
}
export function findObjectByAddressAndType(groupedData, targetAddress, targetType) {
  // 查找指定的 address 对象
  const addressGroup = groupedData.find(
    (group) => group.address === targetAddress
  );
  if (!addressGroup) {
    return null; // 如果找不到 address，则返回 null
  }
  console.log(addressGroup);
  // 在找到的 address 对象中查找指定的 type
  const matchedItem = addressGroup.items.find((item) =>
    item.type.includes(targetType)
  );
  if (!matchedItem) {
    return null; // 如果找不到匹配的 type，则返回 null
  }

  // 返回匹配的 object
  return matchedItem.object;
}
