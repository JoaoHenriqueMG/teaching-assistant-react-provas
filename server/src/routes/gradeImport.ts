import { Router } from 'express';

/**
 * Routes for importing grades from a spreadsheet. Mounted at /api/classes.
 *
 * POST /api/classes/gradeImport/:classId is meant to serve two flows (a
 * single endpoint was preferred over two):
 * [Client] uploads the spreadsheet → [Server] reads only the header and
 *          returns the spreadsheet columns and the goals of 'classId';
 * [Client] maps spreadsheet columns to goals → [Server] parses the whole
 *          file (streaming).
 *
 * The upload itself (multipart/form-data, e.g. with multer) must only be
 * accepted once the endpoint is implemented: until then, accepting files
 * would let any client fill the server's disk for nothing.
 */
export function gradeImportRoutes(): Router {
  const router = Router();

  router.post('/gradeImport/:classId', (req, res) => {
    res.status(501).json({ error: 'Endpoint not implemented yet.' });
  });

  return router;
}
