module.exports = function (migration) {
  const article = migration.editContentType('article');

  // 1. SEO description — capped length, mirrors a real meta-description limit.
  article
    .createField('seoDescription')
    .name('SEO description')
    .type('Symbol')
    .required(false)
    .localized(false)
    .validations([
      {
        size: { max: 160 },
        message: 'Keep the SEO description under 160 characters.',
      },
    ]);

  // 2. SEO keywords — a LIST field. Lists are where naive mappers break,
  //    because the value arrives as an array, not a scalar.
  article
    .createField('seoKeywords')
    .name('SEO keywords')
    .type('Array')
    .required(false)
    .items({
      type: 'Symbol',
      validations: [{ size: { max: 60 } }],
    });

  // 3. Boolean with a default — exercises defaultValue handling in the mapper.
  article
    .createField('seoNoIndex')
    .name('Exclude from search engines')
    .type('Boolean')
    .required(false)
    .defaultValue({ 'en-US': false });

  // Editor experience: help text is metadata on the field control, not on the
  // field itself, and never appears in the Delivery API payload.
  article.changeFieldControl('seoDescription', 'builtin', 'singleLine', {
    helpText: 'Shown in search results. Aim for 120–160 characters.',
  });

  article.changeFieldControl('seoKeywords', 'builtin', 'tagEditor', {
    helpText: 'Press Enter after each keyword.',
  });

  article.changeFieldControl('seoNoIndex', 'builtin', 'boolean', {
    trueLabel: 'Hide from search engines',
    falseLabel: 'Allow indexing',
    helpText: 'Defaults to allowing indexing.',
  });

  // Group the SEO fields together in the editor. Field order is presentation
  // only — it has no effect on the API payload.
  article.moveField('seoDescription').afterField('publishedDate');
  article.moveField('seoKeywords').afterField('seoDescription');
  article.moveField('seoNoIndex').afterField('seoKeywords');
};
