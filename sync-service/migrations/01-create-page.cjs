module.exports = function (migration) {
  const page = migration
    .createContentType("page")
    .name("Page")
    .description("Generic page, created via migration")
    .displayField("title");

  page.createField("title").name("Title").type("Symbol").required(true);
  page.createField("slug").name("Slug").type("Symbol").required(true);
  page.createField("body").name("Body").type("RichText");
  page
    .createField("banner")
    .name("Banner")
    .type("Link")
    .linkType("Entry")
    .validations([{ linkContentType: ["banner"] }]);

  page.changeFieldControl("title", "builtin", "singleLine");
};
