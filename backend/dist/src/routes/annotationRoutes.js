"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const annotationController_1 = require("../controllers/annotationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const sseAuthMiddleware_1 = require("../middleware/sseAuthMiddleware");
const router = (0, express_1.Router)();
// SSE stream (must be registered before authMiddleware, since EventSource can't set headers)
router.get('/stream/doc/:docId', sseAuthMiddleware_1.sseAuthMiddleware, annotationController_1.streamAnnotationEvents);
router.use(authMiddleware_1.authMiddleware);
router.get('/doc/:docId', annotationController_1.getAnnotationsByDoc);
router.post('/stream-token', annotationController_1.createStreamToken);
router.post('/', annotationController_1.createAnnotation);
router.put('/:id', annotationController_1.updateAnnotation);
router.delete('/:id', annotationController_1.deleteAnnotation);
router.post('/:id/comments', annotationController_1.createComment);
router.put('/comments/:commentId', annotationController_1.updateComment);
router.delete('/comments/:commentId', annotationController_1.deleteComment);
exports.default = router;
