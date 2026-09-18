import { Router } from 'express';

// usado para ler arquivos em POST
const multer = require('multer');

// pasta usada para salvar os upload's feitos
const upload_dir = multer({ dest: 'tmp_data/' });

/**
 * Routes for importing grades from a spreadsheet. Mounted at /api/classes.
 *
 * POST /api/classes/gradeImport/:classId, usado na feature de importacao de grades
 * Vai ser usado em 2 fluxos (poderia ter divido em 2 endpoints mas preferi deixar em apenas 1)
 * [Front] Upload → [Back] lê só o cabeçalho e retorna colunas da planilha e os goals da 'classId'
 * [Front] Mapeia colunas da planilha para os goals → [Back] faz parse completo (stream)
 */
export function gradeImportRoutes(): Router {
  const router = Router();

  router.post('/gradeImport/:classId', upload_dir.single('file'), async (req, res) => {
    res.status(501).json({ error: 'Endpoint ainda não implementado.' });
  });

  return router;
}
