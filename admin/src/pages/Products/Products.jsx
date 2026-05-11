import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { productsService } from "../../services/products";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";
import { useLoading } from "../../contexts/LoadingContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import AnimatedModal from "../../components/ui/AnimatedModal";
import {
  MdSearch,
  MdFilterList,
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
  MdAdd,
  MdEdit,
  MdLock,
  MdLockOpen,
} from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import ProductsFilterDrawer from "../../components/products/ProductsFilterDrawer";

const DEFAULT_FILTERS = {
  fabricante: "",
  marca: "",
  precoMin: "",
  precoMax: "",
};

const EMPTY_PRODUCT_FORM = {
  nome: "",
  preco: "",
  sku: "",
  fabricante: "",
  descricao: "",
  marca: "",
  peso: "",
  codigo_produto: "",
};

function formatBRL(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseDecimalInput(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isNaN(n) ? NaN : n;
}

const textareaClass =
  "w-full rounded-lg border border-tegra-gray-medium px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tegra-teal sm:px-3 sm:py-2.5 sm:text-base";

/** Produto ativo no banco (default true se coluna ausente em linhas antigas). */
function isProdutoAtivo(p) {
  return p.ativo !== false;
}

export default function Products() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const [items, setItems] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [filterDraft, setFilterDraft] = useState(DEFAULT_FILTERS);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  });

  const isAdmin =
    String(authService.getUser()?.tipo || authService.getUser()?.Tipo || "")
      .toLowerCase() === "admin";

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_PRODUCT_FORM);
  const [editForm, setEditForm] = useState(EMPTY_PRODUCT_FORM);
  const [togglingId, setTogglingId] = useState(null);

  const filtersSignature = useMemo(
    () =>
      JSON.stringify({
        fabricante: appliedFilters.fabricante,
        marca: appliedFilters.marca,
        precoMin: appliedFilters.precoMin,
        precoMax: appliedFilters.precoMax,
      }),
    [appliedFilters],
  );

  const debounceTimerRef = useRef(null);
  const prevDebouncedRef = useRef(debouncedSearch);
  const prevFiltersSigRef = useRef(filtersSignature);
  const firstLoadRef = useRef(true);
  const searchFetchIdRef = useRef(0);

  useEffect(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 280);
    return () => clearTimeout(debounceTimerRef.current);
  }, [searchTerm]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }
    const currentUser = authService.getUser();
    const userTipo = (currentUser?.tipo || currentUser?.Tipo || "").toLowerCase();
    if (userTipo !== "admin") {
      showToast("❌ Você não tem permissão para acessar esta página", "error");
      navigate(ROUTES.DASHBOARD);
    }
  }, [navigate, showToast]);

  const parsePreco = (v) => {
    const s = String(v ?? "").trim().replace(",", ".");
    if (s === "") return "";
    const n = Number(s);
    return Number.isNaN(n) ? "" : n;
  };

  const fetchProducts = useCallback(
    async (showGlobalLoading = false) => {
      const id = ++searchFetchIdRef.current;
      try {
        setLocalLoading(true);
        if (showGlobalLoading) setLoading(true);

        const response = await productsService.getCatalog({
          page: currentPage,
          perPage: 10,
          search: debouncedSearch,
          fabricante: appliedFilters.fabricante.trim(),
          marca: appliedFilters.marca.trim(),
          precoMin: parsePreco(appliedFilters.precoMin),
          precoMax: parsePreco(appliedFilters.precoMax),
        });

        if (id !== searchFetchIdRef.current) return;

        if (response.success) {
          setItems(response.data || []);
          setPagination(
            response.pagination || {
              page: currentPage,
              perPage: 10,
              total: 0,
              totalPages: 1,
            },
          );
        }
        setLocalLoading(false);
        if (showGlobalLoading) {
          requestAnimationFrame(() => {
            setTimeout(() => setLoading(false), 150);
          });
        }
      } catch (error) {
        if (id !== searchFetchIdRef.current) return;
        console.error("Erro ao buscar produtos:", error);
        if (error.status === 403) {
          showToast(
            error.error || "❌ Acesso negado ao catálogo de produtos",
            "error",
          );
          navigate(ROUTES.DASHBOARD);
        } else if (error.status === 429) {
          showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
        } else {
          showToast("❌ Erro ao carregar produtos", "error");
        }
        setLocalLoading(false);
        if (showGlobalLoading) setLoading(false);
      }
    },
    [
      currentPage,
      debouncedSearch,
      appliedFilters,
      navigate,
      setLoading,
      showToast,
    ],
  );

  useEffect(() => {
    const searchChanged = prevDebouncedRef.current !== debouncedSearch;
    const filtersChanged = prevFiltersSigRef.current !== filtersSignature;
    const isQueryChange = searchChanged || filtersChanged;

    if (isQueryChange && currentPage !== 1) {
      prevDebouncedRef.current = debouncedSearch;
      prevFiltersSigRef.current = filtersSignature;
      setCurrentPage(1);
      return;
    }

    prevDebouncedRef.current = debouncedSearch;
    prevFiltersSigRef.current = filtersSignature;

    const showGlobalLoading = firstLoadRef.current;
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
    }

    fetchProducts(showGlobalLoading);
  }, [currentPage, debouncedSearch, filtersSignature, fetchProducts]);

  const flushSearch = useCallback((e) => {
    e?.preventDefault?.();
    clearTimeout(debounceTimerRef.current);
    setDebouncedSearch(searchTerm.trim());
  }, [searchTerm]);

  function handlePageChange(page) {
    if (page >= 1 && page <= (pagination.totalPages || 1)) {
      setCurrentPage(page);
    }
  }

  function openFilterDrawer() {
    setFilterDraft({ ...appliedFilters });
    setFilterDrawerOpen(true);
  }

  function handleApplyFilters() {
    setAppliedFilters({ ...filterDraft });
    setFilterDrawerOpen(false);
  }

  function handleResetFilters() {
    setFilterDraft({ ...DEFAULT_FILTERS });
    setAppliedFilters({ ...DEFAULT_FILTERS });
    setFilterDrawerOpen(false);
  }

  function handleOpenCreateModal() {
    setCreateForm({ ...EMPTY_PRODUCT_FORM });
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isSavingCreate) return;
    setIsCreateModalOpen(false);
  }

  function handleOpenEditModal(p) {
    setEditingId(p.id);
    setEditForm({
      nome: p.nome ?? "",
      preco: p.preco != null ? String(p.preco) : "",
      sku: p.sku ?? "",
      fabricante: p.fabricante ?? "",
      descricao: p.descricao ?? "",
      marca: p.marca ?? "",
      peso: p.peso != null ? String(p.peso) : "",
      codigo_produto: p.codigo_produto ?? "",
    });
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    if (isSavingEdit) return;
    setIsEditModalOpen(false);
    setEditingId(null);
  }

  function handleOpenViewModal(product) {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  }

  function handleCloseViewModal() {
    setIsViewModalOpen(false);
    setViewingProduct(null);
  }

  function buildCreatePayload() {
    const preco = parseDecimalInput(createForm.preco);
    if (preco === null || preco < 0 || Number.isNaN(preco)) return { error: "Informe um preço válido" };
    const pesoRaw = createForm.peso.trim();
    let peso = null;
    if (pesoRaw !== "") {
      const pv = parseDecimalInput(pesoRaw);
      if (pv === null || Number.isNaN(pv)) return { error: "Peso inválido" };
      peso = pv;
    }
    const payload = {
      nome: createForm.nome.trim(),
      preco,
      sku: createForm.sku.trim(),
      fabricante: createForm.fabricante.trim() || null,
      descricao: createForm.descricao.trim() || null,
      marca: createForm.marca.trim() || null,
      peso,
    };
    if (createForm.codigo_produto.trim()) {
      payload.codigo_produto = createForm.codigo_produto.trim();
    }
    return { payload };
  }

  async function handleSubmitCreate(e) {
    e.preventDefault();
    if (!createForm.nome.trim()) {
      showToast("❌ Nome é obrigatório", "error");
      return;
    }
    if (!createForm.sku.trim()) {
      showToast("❌ SKU é obrigatório", "error");
      return;
    }
    const built = buildCreatePayload();
    if (built.error) {
      showToast(`❌ ${built.error}`, "error");
      return;
    }

    try {
      setIsSavingCreate(true);
      setLoading(true);
      const res = await productsService.createCatalogProduct(built.payload);
      if (res.success) {
        showToast("✅ Produto criado com sucesso", "success");
        handleCloseCreateModal();
        await fetchProducts(false);
      }
    } catch (err) {
      if (err.status === 409) {
        showToast(
          err.error || "❌ Já existe produto com mesmo nome, SKU ou código",
          "error",
        );
      } else {
        showToast(err.error || "❌ Erro ao criar produto", "error");
      }
    } finally {
      setIsSavingCreate(false);
      setLoading(false);
    }
  }

  async function handleSubmitEdit(e) {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.nome.trim()) {
      showToast("❌ Nome é obrigatório", "error");
      return;
    }
    if (!editForm.sku.trim()) {
      showToast("❌ SKU é obrigatório", "error");
      return;
    }
    const preco = parseDecimalInput(editForm.preco);
    if (preco === null || preco < 0 || Number.isNaN(preco)) {
      showToast("❌ Informe um preço válido", "error");
      return;
    }
    let peso = null;
    const pesoRaw = editForm.peso.trim();
    if (pesoRaw !== "") {
      const pv = parseDecimalInput(pesoRaw);
      if (pv === null || Number.isNaN(pv)) {
        showToast("❌ Peso inválido", "error");
        return;
      }
      peso = pv;
    }
    if (!editForm.codigo_produto.trim()) {
      showToast("❌ Código do produto é obrigatório", "error");
      return;
    }

    const payload = {
      nome: editForm.nome.trim(),
      preco,
      sku: editForm.sku.trim(),
      fabricante: editForm.fabricante.trim() || null,
      descricao: editForm.descricao.trim() || null,
      marca: editForm.marca.trim() || null,
      peso,
      codigo_produto: editForm.codigo_produto.trim(),
    };

    try {
      setIsSavingEdit(true);
      setLoading(true);
      const res = await productsService.updateCatalogProduct(editingId, payload);
      if (res.success) {
        showToast("✅ Produto atualizado com sucesso", "success");
        handleCloseEditModal();
        await fetchProducts(false);
      }
    } catch (err) {
      if (err.status === 409) {
        showToast(
          err.error || "❌ Já existe produto com mesmo nome, SKU ou código",
          "error",
        );
      } else if (err.status === 404) {
        showToast("❌ Produto não encontrado", "error");
      } else {
        showToast(err.error || "❌ Erro ao atualizar produto", "error");
      }
    } finally {
      setIsSavingEdit(false);
      setLoading(false);
    }
  }

  async function handleToggleProduto(p) {
    if (!isAdmin) return;
    try {
      setTogglingId(p.id);
      const res = await productsService.toggleCatalogProductStatus(p.id);
      if (res.success && res.data) {
        const novoAtivo = res.data.ativo !== false;
        showToast(
          novoAtivo ? "✅ Produto ativado" : "✅ Produto desativado",
          "success",
        );
        setItems((prev) =>
          prev.map((row) =>
            row.id === p.id ? { ...row, ativo: res.data.ativo } : row,
          ),
        );
      }
    } catch (err) {
      showToast(err.error || "❌ Erro ao alterar status do produto", "error");
    } finally {
      setTogglingId(null);
    }
  }

  const hasActiveFilters =
    appliedFilters.fabricante.trim() !== "" ||
    appliedFilters.marca.trim() !== "" ||
    String(appliedFilters.precoMin).trim() !== "" ||
    String(appliedFilters.precoMax).trim() !== "";

  return (
    <MainLayout>
      <ProductsFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        draft={filterDraft}
        setDraft={setFilterDraft}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <AnimatedModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        panelClassName="max-h-[90vh] overflow-y-auto max-w-lg w-full"
      >
        <div className="flex items-center justify-between border-b border-tegra-gray-medium px-5 py-4">
          <h2 className="text-lg font-bold text-tegra-text-primary sm:text-xl">
            Novo produto
          </h2>
          <button
            type="button"
            onClick={handleCloseCreateModal}
            className="text-tegra-text-secondary transition hover:text-tegra-text-primary"
            disabled={isSavingCreate}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmitCreate} className="space-y-4 px-5 py-4">
          <Input
            label="Nome"
            required
            value={createForm.nome}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, nome: e.target.value }))
            }
            placeholder="Nome único do produto"
            disabled={isSavingCreate}
          />
          <Input
            label="Preço (R$)"
            required
            type="text"
            inputMode="decimal"
            value={createForm.preco}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, preco: e.target.value }))
            }
            placeholder="0,00"
            disabled={isSavingCreate}
          />
          <Input
            label="SKU"
            required
            value={createForm.sku}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, sku: e.target.value }))
            }
            placeholder="Código SKU único"
            disabled={isSavingCreate}
          />
          <Input
            label="Código do produto (opcional)"
            value={createForm.codigo_produto}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, codigo_produto: e.target.value }))
            }
            placeholder="Deixe em branco para gerar automaticamente"
            disabled={isSavingCreate}
          />
          <Input
            label="Fabricante"
            value={createForm.fabricante}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, fabricante: e.target.value }))
            }
            disabled={isSavingCreate}
          />
          <Input
            label="Marca"
            value={createForm.marca}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, marca: e.target.value }))
            }
            disabled={isSavingCreate}
          />
          <Input
            label="Peso (kg)"
            type="text"
            inputMode="decimal"
            value={createForm.peso}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, peso: e.target.value }))
            }
            placeholder="Opcional"
            disabled={isSavingCreate}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-tegra-text-secondary sm:mb-2 sm:text-sm">
              Descrição
            </label>
            <textarea
              className={textareaClass}
              rows={4}
              value={createForm.descricao}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, descricao: e.target.value }))
              }
              placeholder="Descrição do produto"
              disabled={isSavingCreate}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCreateModal}
              disabled={isSavingCreate}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSavingCreate}>
              Salvar
            </Button>
          </div>
        </form>
      </AnimatedModal>

      <AnimatedModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        panelClassName="max-h-[90vh] overflow-y-auto max-w-lg w-full"
      >
        <div className="flex items-center justify-between border-b border-tegra-gray-medium px-5 py-4">
          <h2 className="text-lg font-bold text-tegra-text-primary sm:text-xl">
            Editar produto
          </h2>
          <button
            type="button"
            onClick={handleCloseEditModal}
            className="text-tegra-text-secondary transition hover:text-tegra-text-primary"
            disabled={isSavingEdit}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmitEdit} className="space-y-4 px-5 py-4">
          <Input
            label="Nome"
            required
            value={editForm.nome}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, nome: e.target.value }))
            }
            disabled={isSavingEdit}
          />
          <Input
            label="Preço (R$)"
            required
            type="text"
            inputMode="decimal"
            value={editForm.preco}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, preco: e.target.value }))
            }
            disabled={isSavingEdit}
          />
          <Input
            label="SKU"
            required
            value={editForm.sku}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, sku: e.target.value }))
            }
            disabled={isSavingEdit}
          />
          <Input
            label="Código do produto"
            required
            value={editForm.codigo_produto}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, codigo_produto: e.target.value }))
            }
            disabled={isSavingEdit}
          />
          <Input
            label="Fabricante"
            value={editForm.fabricante}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, fabricante: e.target.value }))
            }
            disabled={isSavingEdit}
          />
          <Input
            label="Marca"
            value={editForm.marca}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, marca: e.target.value }))
            }
            disabled={isSavingEdit}
          />
          <Input
            label="Peso (kg)"
            type="text"
            inputMode="decimal"
            value={editForm.peso}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, peso: e.target.value }))
            }
            placeholder="Opcional"
            disabled={isSavingEdit}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-tegra-text-secondary sm:mb-2 sm:text-sm">
              Descrição
            </label>
            <textarea
              className={textareaClass}
              rows={4}
              value={editForm.descricao}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, descricao: e.target.value }))
              }
              disabled={isSavingEdit}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseEditModal}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSavingEdit}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </AnimatedModal>

      <AnimatedModal
        open={isViewModalOpen}
        onClose={handleCloseViewModal}
        panelClassName="max-h-[90vh] overflow-y-auto max-w-lg w-full"
      >
        <div className="flex items-center justify-between border-b border-tegra-gray-medium px-5 py-4">
          <h2 className="text-lg font-bold text-tegra-text-primary sm:text-xl">
            Dados do produto
          </h2>
          <button
            type="button"
            onClick={handleCloseViewModal}
            className="text-tegra-text-secondary transition hover:text-tegra-text-primary"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">Nome</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {viewingProduct?.nome || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">SKU</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {viewingProduct?.sku || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">Preço</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {formatBRL(viewingProduct?.preco)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">Status</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {isProdutoAtivo(viewingProduct || {}) ? "Ativo" : "Inativo"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">Fabricante</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {viewingProduct?.fabricante || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">Marca</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {viewingProduct?.marca || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">Peso (kg)</p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {viewingProduct?.peso != null && String(viewingProduct.peso) !== ""
                  ? viewingProduct.peso
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">
                Código do produto
              </p>
              <p className="mt-1 text-sm text-tegra-text-primary">
                {viewingProduct?.codigo_produto || "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-tegra-text-secondary">Descrição</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-tegra-text-primary">
              {viewingProduct?.descricao || "—"}
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="primary" onClick={handleCloseViewModal}>
              Fechar
            </Button>
          </div>
        </div>
      </AnimatedModal>

      <div className="w-full px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mb-4 space-y-3 sm:mb-6">
          <div className="flex w-full items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-tegra-text-primary sm:text-2xl">
              Produtos
            </h1>
            {isAdmin && (
              <Button
                type="button"
                variant="primary"
                onClick={handleOpenCreateModal}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MdAdd className="text-lg" />
                  Adicionar
                </span>
              </Button>
            )}
          </div>

          <div className="flex w-full items-center justify-end gap-2">
            <div className="flex-1 sm:flex-initial sm:w-72">
              <Input
                label=""
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou SKU…"
                iconRight={<MdSearch className="text-xl" />}
                onIconClick={(e) => flushSearch(e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    flushSearch(e);
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={openFilterDrawer}
              className="relative rounded-lg border-2 border-tegra-blue-dark p-2 text-tegra-blue-dark transition hover:bg-tegra-blue-light"
              title="Filtrar"
              aria-label="Abrir filtros"
            >
              <MdFilterList className="text-lg sm:text-xl" />
              {hasActiveFilters && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-tegra-teal ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-tegra-bg-primary shadow-md">
          {localLoading && items.length === 0 ? (
            <div className="p-6 text-center text-sm text-tegra-text-secondary sm:p-8 sm:text-base">
              Carregando produtos...
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-tegra-text-secondary sm:p-8 sm:text-base">
              Nenhum produto encontrado
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <div className="space-y-3 p-3">
                  {items.map((p) => {
                    const ativo = isProdutoAtivo(p);
                    return (
                      <div
                        key={p.id}
                        className="cursor-pointer rounded-lg border border-tegra-gray-medium bg-white p-4 shadow-sm transition hover:bg-tegra-gray-light"
                        onClick={() => handleOpenViewModal(p)}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="font-semibold text-tegra-text-primary">
                            {p.nome || "—"}
                          </p>
                          {isAdmin && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(p);
                                }}
                                className="rounded p-2 text-tegra-blue-dark transition hover:bg-tegra-blue-light"
                                title="Editar"
                                aria-label="Editar produto"
                              >
                                <MdEdit className="text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleProduto(p);
                                }}
                                disabled={togglingId === p.id}
                                className={`rounded p-2 transition disabled:opacity-50 ${
                                  ativo
                                    ? "text-tegra-success hover:bg-tegra-success-light"
                                    : "text-tegra-error hover:bg-tegra-error-light"
                                }`}
                                title={
                                  ativo
                                    ? "Desativar produto"
                                    : "Ativar produto"
                                }
                                aria-label={
                                  ativo
                                    ? "Desativar produto"
                                    : "Ativar produto"
                                }
                              >
                                {ativo ? (
                                  <MdLockOpen className="text-lg" />
                                ) : (
                                  <MdLock className="text-lg" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-tegra-text-secondary">
                          SKU: {p.sku || "—"}
                        </p>
                        <p className="mt-2 text-sm font-medium text-tegra-text-primary">
                          {formatBRL(p.preco)}
                        </p>
                        <div className="mt-2">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                              ativo
                                ? "bg-tegra-success-light text-tegra-success"
                                : "bg-tegra-error-light text-tegra-error"
                            }`}
                          >
                            {ativo ? "ativo" : "inativo"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-tegra-blue-dark text-tegra-text-inverse">
                          <th className="px-4 py-3 text-left text-sm font-bold md:px-6 md:py-4">
                            Nome
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold md:px-6 md:py-4">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold md:px-6 md:py-4">
                            Preço
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold md:px-6 md:py-4">
                            Status
                          </th>
                          {isAdmin && (
                            <th className="px-4 py-3 text-center text-sm font-bold md:px-6 md:py-4">
                              Ações
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((p) => {
                          const ativo = isProdutoAtivo(p);
                          return (
                            <tr
                              key={p.id}
                              className="cursor-pointer border-b border-tegra-gray-medium transition hover:bg-tegra-gray-light"
                              onClick={() => handleOpenViewModal(p)}
                            >
                              <td className="px-4 py-3 text-sm text-tegra-text-primary md:px-6 md:py-4">
                                <span className="font-medium">
                                  {p.nome || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-sm text-tegra-text-primary md:px-6 md:py-4">
                                {p.sku || "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-tegra-text-primary md:px-6 md:py-4">
                                {formatBRL(p.preco)}
                              </td>
                              <td className="px-4 py-3 md:px-6 md:py-4">
                                <span
                                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                                    ativo
                                      ? "bg-tegra-success-light text-tegra-success"
                                      : "bg-tegra-error-light text-tegra-error"
                                  }`}
                                >
                                  {ativo ? "ativo" : "inativo"}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3 text-center md:px-6 md:py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditModal(p);
                                      }}
                                      className="rounded p-2 text-tegra-blue-dark transition hover:bg-tegra-blue-light"
                                      title="Editar"
                                      aria-label="Editar produto"
                                    >
                                      <MdEdit className="text-lg" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleProduto(p);
                                      }}
                                      disabled={togglingId === p.id}
                                      className={`rounded p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                        ativo
                                          ? "text-tegra-success hover:bg-tegra-success-light"
                                          : "text-tegra-error hover:bg-tegra-error-light"
                                      }`}
                                      title={
                                        ativo
                                          ? "Desativar produto"
                                          : "Ativar produto"
                                      }
                                      aria-label={
                                        ativo
                                          ? "Desativar produto"
                                          : "Ativar produto"
                                      }
                                    >
                                      {ativo ? (
                                        <MdLockOpen className="text-lg" />
                                      ) : (
                                        <MdLock className="text-lg" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-tegra-gray-medium px-3 py-3 sm:flex-row sm:px-6 sm:py-4">
                  <div className="text-xs font-medium text-tegra-blue-dark sm:text-sm">
                    Página {pagination.page} de {pagination.totalPages || 1}
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Primeira página"
                    >
                      <MdFirstPage className="text-lg sm:text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Página anterior"
                    >
                      <MdChevronLeft className="text-lg sm:text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Próxima página"
                    >
                      <MdChevronRight className="text-lg sm:text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={currentPage === pagination.totalPages}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Última página"
                    >
                      <MdLastPage className="text-lg sm:text-xl" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
