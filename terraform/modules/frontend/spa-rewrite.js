function handler(event) {
  var request = event.request;
  var path = request.uri;
  if (path.indexOf("/releases/") === 0) {
    return {
      statusCode: 404,
      statusDescription: "Not Found",
      headers: { "cache-control": { value: "no-store" } }
    };
  }
  var day = /^\/(?:[1-9]|[12][0-9]|3[01])$/;
  var passage = /^\/(?:[1-9]|[12][0-9]|3[01])\/(?:psalm|proverbs)\/[1-9][0-9]*(?:\/(?:intro|[0-9]+[a-z]?(?:-[0-9]+[a-z]?)?))?$/;
  if (path === "/" || day.test(path) || passage.test(path)) {
    request.uri = "/index.html";
  }
  return request;
}
