import express from "express";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import {
  DATASETS,
  getAuthorizedDatasets,
  queryDatasetRecords,
  generateCSV,
  recordExportLog,
  getExportHistory,
  getEventsList,
} from "../services/exportCenterService.js";

const router = express.Router();

router.get("/events-list", verifyToken, async (req, res) => {
  try {
    const { clubId = "all" } = req.query;
    const events = await getEventsList(req.user, clubId);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/datasets", verifyToken, async (req, res) => {
  try {
    const authorized = getAuthorizedDatasets(req.user);
    res.json({
      success: true,
      datasets: authorized.map((ds) => ({
        id: ds.id,
        label: ds.label,
        description: ds.description,
        defaultColumns: ds.defaultColumns,
        allColumns: ds.allColumns,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/preview", verifyToken, async (req, res) => {
  try {
    const { dataset, session, semester, clubId, page = 1, limit = 50, ...customFilters } = req.query;

    if (!dataset || !DATASETS[dataset]) {
      return res.status(400).json({ success: false, message: "Valid dataset parameter is required." });
    }

    const filters = {
      session: session || "all",
      semester: semester || "all",
      clubId: clubId || "all",
      ...customFilters,
    };

    const result = await queryDatasetRecords({
      datasetId: dataset,
      user: req.user,
      filters,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      isExport: false,
    });

    const datasetConfig = DATASETS[dataset];

    res.json({
      success: true,
      dataset,
      allColumns: datasetConfig.allColumns,
      defaultColumns: datasetConfig.defaultColumns,
      records: result.records,
      totalCount: result.totalCount,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    const status = err.message.startsWith("Forbidden") ? 403 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

router.post("/export", verifyToken, async (req, res) => {
  try {
    const { dataset, session, semester, clubId, columns = [], filters = {} } = req.body;

    if (!dataset || !DATASETS[dataset]) {
      return res.status(400).json({ success: false, message: "Valid dataset parameter is required." });
    }

    const mergedFilters = {
      session: session || "all",
      semester: semester || "all",
      clubId: clubId || "all",
      ...filters,
    };

    const result = await queryDatasetRecords({
      datasetId: dataset,
      user: req.user,
      filters: mergedFilters,
      isExport: true,
    });

    const csvContent = generateCSV(result.records, columns, dataset);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `campusnode_${dataset}_${timestamp}.csv`;

    await recordExportLog({
      dataset,
      recordCount: result.records.length,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      filters: mergedFilters,
      columns,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    const status = err.message.startsWith("Forbidden") ? 403 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

router.get("/history", verifyToken, requirePermission(PERMISSIONS.AUDIT_VIEW), async (req, res) => {
  try {
    const history = await getExportHistory(30);
    res.json({
      success: true,
      history,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
