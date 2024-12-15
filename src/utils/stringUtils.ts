function numberToRJIdString(id: number) {
  if (id < 1000000) {
    return 'RJ' + id;
  } else {
    return 'RJ0' + id;
  }
}

function pathQueryToUrl(basePath: string, queryParams: Record<string, any>) {
  const url = new URL(basePath);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }
  return url;
}

export default {
  numberToRJIdString,
  pathQueryToUrl,
};
