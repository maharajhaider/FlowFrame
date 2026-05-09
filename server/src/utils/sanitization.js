const createDOMPurify = require("dompurify");
const {JSDOM} = require("jsdom");
const {window} = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const sanitizeBody = (fields) => (req, res, next) => {
  fields.forEach((f) => {
    if (req.body[f]) {
      req.body[f] = DOMPurify.sanitize(req.body[f], { ALLOWED_TAGS: [] }); // strip all tags
    }
  });
  next();
};
module.exports = { sanitizeBody };
