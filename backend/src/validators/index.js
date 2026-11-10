const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    error.isJoi = true;
    return next(error);
  }
  return next();
};

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  class: Joi.string().max(50).optional().allow('', null),
  exam: Joi.string().max(50).optional().allow('', null),
});

const questionSchema = Joi.object({
  question_text: Joi.string().required(),
  options: Joi.array().items(Joi.string()).min(2).required(),
  correct_answer: Joi.string().required(),
  explanation: Joi.string().allow('', null),
  topic: Joi.string().allow('', null),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
});

const createTestSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  subject: Joi.string().min(2).max(100).required(),
  chapter: Joi.string().max(100).optional().allow('', null),
  questions: Joi.array().items(questionSchema).min(1).required(),
});

const createDocumentSchema = Joi.object({
  file_name: Joi.string().required(),
  storage_path: Joi.string().required(),
  file_size: Joi.number().integer().positive().optional(),
  mime_type: Joi.string().default('application/pdf'),
  subject: Joi.string().default('General'),
  chapter: Joi.string().default('General'),
});

const submitAnswerSchema = Joi.object({
  question_id: Joi.string().required(),
  selected_answer: Joi.string().required(),
  time_taken: Joi.number().integer().min(0).default(0),
});

const completeAttemptSchema = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      question_id: Joi.string().required(),
      selected_answer: Joi.string().required(),
      time_taken: Joi.number().integer().min(0).default(0),
    })
  ).optional(),
});

const ragAnalyzeMistakeSchema = Joi.object({
  mistake_id: Joi.string().uuid().optional(),
  question: Joi.string().required(),
  student_answer: Joi.string().required(),
  correct_answer: Joi.string().required(),
  topic: Joi.string().optional().allow('', null),
  subject: Joi.string().optional().allow('', null),
  chapter: Joi.string().optional().allow('', null),
  document_ids: Joi.array().items(Joi.string()).optional().default([]),
});

const ragQuerySchema = Joi.object({
  query: Joi.string().min(2).required(),
  subject: Joi.string().optional(),
  chapter: Joi.string().optional(),
  top_k: Joi.number().integer().min(1).max(10).default(5),
});

const ragAskDoubtSchema = Joi.object({
  query: Joi.string().trim().max(4000).allow('', null).optional(),
  subject: Joi.string().trim().min(1).max(80).optional(),
  chapter: Joi.string().trim().min(1).max(120).optional(),
  file_content: Joi.string().max(14 * 1024 * 1024).allow('', null).optional(),
  file_name: Joi.string().max(255).allow('', null).optional(),
  file_type: Joi.string()
    .valid('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    .allow('', null)
    .optional(),
}).custom((value, helpers) => {
  if (!value.query?.trim() && !value.file_content) {
    return helpers.error('any.custom', { message: 'Enter a question or attach an image or PDF.' });
  }
  return value;
}).messages({
  'any.custom': '{{#message}}',
});

module.exports = {
  validate,
  updateProfileSchema,
  createTestSchema,
  createDocumentSchema,
  submitAnswerSchema,
  completeAttemptSchema,
  ragAnalyzeMistakeSchema,
  ragQuerySchema,
  ragAskDoubtSchema,
};
