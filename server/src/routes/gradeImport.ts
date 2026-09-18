import { Router } from 'express';

/**
 * Routes for importing grades from a spreadsheet. Mounted at /api/classes.
 *
 * POST /api/classes/gradeImport/:classId, usado na feature de importacao de grades
 * Vai ser usado em 2 fluxos (poderia ter divido em 2 endpoints mas preferi deixar em apenas 1)
 * [Front] Upload → [Back] lê só o cabeçalho e retorna colunas da planilha e os goals da 'classId'
 * [Front] Mapeia colunas da planilha para os goals → [Back] faz parse completo (stream)
 *
 * The upload itself (multipart/form-data, e.g. with multer) must only be
 * accepted once the endpoint is implemented: until then, accepting files
 * would let any client fill the server's disk for nothing.
 */
export function gradeImportRoutes(): Router {
  const router = Router();

  router.post('/gradeImport/:classId', (req, res) => {
    res.status(501).json({ error: 'Endpoint ainda não implementado.' });
  });

  return router;
}
