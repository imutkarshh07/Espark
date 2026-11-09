const express = require('express');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, createDocumentSchema } = require('../validators');

const router = express.Router();

router.use(authMiddleware);

router.get('/', documentController.listDocuments);
router.post('/', validate(createDocumentSchema), documentController.createDocument);
router.get('/:id', documentController.getDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
