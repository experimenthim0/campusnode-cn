import api from "./api";

/**
 * Service for Campus Updates (Instagram-Style Official Feed)
 */

export const getCampusUpdates = async ({
  category = "ALL",
  search = "",
  page = 1,
  limit = 10,
  postId = null,
} = {}) => {
  const params = {
    category,
    page,
    limit,
  };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  if (postId) {
    params.postId = postId;
  }

  const response = await api.get("/api/campus-updates", { params });
  return response.data;
};

export const getCampusUpdateById = async (id) => {
  const response = await api.get(`/api/campus-updates/${id}`);
  return response.data;
};

export const getAdminCampusUpdates = async ({
  status = "ALL",
  category = "ALL",
  search = "",
  page = 1,
  limit = 20,
} = {}) => {
  const params = {
    status,
    category,
    page,
    limit,
  };
  if (search && search.trim()) {
    params.search = search.trim();
  }

  const response = await api.get("/api/campus-updates/admin/all", { params });
  return response.data;
};

export const createCampusUpdate = async (data) => {
  const response = await api.post("/api/campus-updates/admin", data);
  return response.data;
};

export const updateCampusUpdate = async (id, data) => {
  const response = await api.put(`/api/campus-updates/admin/${id}`, data);
  return response.data;
};

export const togglePinCampusUpdate = async (id) => {
  const response = await api.patch(`/api/campus-updates/admin/${id}/pin`);
  return response.data;
};

export const toggleStatusCampusUpdate = async (id) => {
  const response = await api.patch(`/api/campus-updates/admin/${id}/status`);
  return response.data;
};

export const deleteCampusUpdate = async (id) => {
  const response = await api.delete(`/api/campus-updates/admin/${id}`);
  return response.data;
};

export const uploadUpdateMedia = async (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }

  const response = await api.post("/api/campus-updates/admin/upload-media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
