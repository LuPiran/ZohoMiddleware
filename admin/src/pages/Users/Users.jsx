import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { usersService } from "../../services/users";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";
import { useLoading } from "../../contexts/LoadingContext";
import Avatar from "../../components/ui/Avatar";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  MdSearch,
  MdFilterList,
  MdEdit,
  MdLock,
  MdLockOpen,
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
  MdAdd,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import UsersFilterDrawer from "../../components/users/UsersFilterDrawer";
import AnimatedModal from "../../components/ui/AnimatedModal";
import { TegraAnimatedMenu } from "../../components/ui/TegraAnimatedMenu";
import { getTegraSelectStyles } from "../../utils/reactSelectTegraStyles";

const DEFAULT_USER_FILTERS = {
  status: "all",
  createdFrom: null,
  createdTo: null,
  modifiedFrom: null,
  modifiedTo: null,
};

const USER_TYPES = ["Consultor", "Gerente", "Diretoria", "Admin"];

export default function Users() {
  const userTypes = USER_TYPES;
  const tipoSelectOptions = useMemo(
    () => USER_TYPES.map((t) => ({ value: t, label: t })),
    [],
  );
  const modalSelectStyles = useMemo(
    () => getTegraSelectStyles({ menuPortalZIndex: 10000 }),
    [],
  );
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const [usuarios, setUsuarios] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_USER_FILTERS);
  const [filterDraft, setFilterDraft] = useState(DEFAULT_USER_FILTERS);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    tipo: "Consultor",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    nome: "",
    email: "",
    tipo: "Consultor",
    senha: "",
    confirmarSenha: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const isAdmin = String(authService.getUser()?.tipo || "").toLowerCase() === "admin";

  const filtersSignature = useMemo(
    () =>
      JSON.stringify({
        status: appliedFilters.status,
        createdFrom: appliedFilters.createdFrom?.toISOString?.() ?? null,
        createdTo: appliedFilters.createdTo?.toISOString?.() ?? null,
        modifiedFrom: appliedFilters.modifiedFrom?.toISOString?.() ?? null,
        modifiedTo: appliedFilters.modifiedTo?.toISOString?.() ?? null,
      }),
    [appliedFilters],
  );

  const debounceTimerRef = useRef(null);
  const prevDebouncedRef = useRef(debouncedSearch);
  const prevFiltersSigRef = useRef(filtersSignature);
  const firstLoadRef = useRef(true);
  const searchFetchIdRef = useRef(0);

  /** Busca contínua: atualiza a lista enquanto o usuário digita (com debounce curto). */
  useEffect(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 280);
    return () => clearTimeout(debounceTimerRef.current);
  }, [searchTerm]);

  useEffect(() => {
    // Verifica autenticação
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Verifica permissão de Admin Painel
    const currentUser = authService.getUser();
    const userTipo = (currentUser?.tipo || currentUser?.Tipo || "").toLowerCase();
    if (userTipo !== "admin") {
      showToast("❌ Você não tem permissão para acessar esta página", "error");
      navigate(ROUTES.DASHBOARD);
      return;
    }
  }, [navigate, showToast]);

  const fetchUsers = useCallback(
    async (showGlobalLoading = false) => {
      const id = ++searchFetchIdRef.current;
      try {
        setLocalLoading(true);
        if (showGlobalLoading) {
          setLoading(true);
        }

        const response = await usersService.getUsers({
          page: currentPage,
          perPage: 10,
          search: debouncedSearch,
          statusFilter: appliedFilters.status,
          createdFrom: appliedFilters.createdFrom,
          createdTo: appliedFilters.createdTo,
          modifiedFrom: appliedFilters.modifiedFrom,
          modifiedTo: appliedFilters.modifiedTo,
        });

        if (id !== searchFetchIdRef.current) {
          return;
        }

        if (response.success) {
          const usersWithoutAdmin = (response.data || []).filter(
            (user) => String(user?.tipo || "").toLowerCase() !== "admin",
          );
          setUsuarios(usersWithoutAdmin);
          setPagination(
            response.pagination || {
              page: currentPage,
              perPage: 10,
              total: 0,
              totalPages: 1,
            },
          );

          setLocalLoading(false);
          if (showGlobalLoading) {
            requestAnimationFrame(() => {
              setTimeout(() => {
                setLoading(false);
              }, 150);
            });
          }
        }
      } catch (error) {
        if (id !== searchFetchIdRef.current) {
          return;
        }
        console.error("Erro ao buscar usuários:", error);
        if (error.status === 429) {
          showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
        } else {
          showToast("❌ Erro ao carregar usuários", "error");
        }
        setLocalLoading(false);
        if (showGlobalLoading) {
          setLoading(false);
        }
      }
    },
    [currentPage, debouncedSearch, appliedFilters, showToast, setLoading],
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

    fetchUsers(showGlobalLoading);
  }, [currentPage, debouncedSearch, filtersSignature, fetchUsers]);

  function flushSearch(e) {
    e?.preventDefault?.();
    clearTimeout(debounceTimerRef.current);
    setDebouncedSearch(searchTerm.trim());
  }

  function openFilterDrawer() {
    setFilterDraft({ ...appliedFilters });
    setFilterDrawerOpen(true);
  }

  function handleApplyFilters() {
    const { createdFrom, createdTo, modifiedFrom, modifiedTo } = filterDraft;
    if (createdFrom && createdTo && createdFrom > createdTo) {
      showToast(
        "❌ Na criação: a data inicial deve ser anterior ou igual à final.",
        "error",
      );
      return;
    }
    if (modifiedFrom && modifiedTo && modifiedFrom > modifiedTo) {
      showToast(
        "❌ Na modificação: a data inicial deve ser anterior ou igual à final.",
        "error",
      );
      return;
    }
    setAppliedFilters({ ...filterDraft });
    setFilterDrawerOpen(false);
  }

  function handleResetFilters() {
    setFilterDraft({ ...DEFAULT_USER_FILTERS });
    setAppliedFilters({ ...DEFAULT_USER_FILTERS });
    setFilterDrawerOpen(false);
  }

  // Formata data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const options = { month: "short", day: "numeric", year: "numeric" };
      const dateStr = date.toLocaleDateString("pt-BR", options);
      const timeStr = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return { date: dateStr, time: timeStr };
    } catch (error) {
      return { date: "-", time: "" };
    }
  };

  // Manipula paginação
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Alterna o status do usuário
  const handleToggleStatus = async (usuario) => {
    try {
      const currentStatusBoolean =
        usuario.statusBoolean !== undefined
          ? usuario.statusBoolean
          : usuario.status === "ativo";

      const response = await usersService.toggleUserStatus(
        usuario.id,
        currentStatusBoolean,
      );

      if (response.success) {
        // Atualiza o usuário na lista local
        setUsuarios((prevUsuarios) =>
          prevUsuarios.map((u) =>
            u.id === usuario.id
              ? {
                  ...u,
                  status: response.data.status ? "ativo" : "inativo",
                  statusBoolean: response.data.status,
                }
              : u,
          ),
        );

        showToast(
          response.data.status
            ? "✅ Usuário ativado com sucesso"
            : "✅ Usuário desativado com sucesso",
          "success",
          2500,
        );
      }
    } catch (error) {
      console.error("Erro ao alternar status:", error);
      if (error.status === 429) {
        showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
      } else {
        showToast("❌ Erro ao alterar status do usuário", "error");
      }
    }
  };

  const passwordChecks = {
    minLength: newUserForm.senha.length >= 8,
    uppercase: /[A-Z]/.test(newUserForm.senha),
    lowercase: /[a-z]/.test(newUserForm.senha),
    number: /\d/.test(newUserForm.senha),
    special: /[^A-Za-z0-9]/.test(newUserForm.senha),
  };

  const passedChecks = Object.values(passwordChecks).filter(Boolean).length;
  const strengthPercentage = (passedChecks / 5) * 100;
  const passwordStrength =
    passedChecks <= 2 ? "fraca" : passedChecks <= 4 ? "media" : "forte";

  const passwordRequirementsText = [
    !passwordChecks.minLength ? "pelo menos 8 caracteres" : null,
    !passwordChecks.uppercase ? "1 letra maiúscula" : null,
    !passwordChecks.lowercase ? "1 letra minúscula" : null,
    !passwordChecks.number ? "1 número" : null,
    !passwordChecks.special ? "1 caractere especial" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const passwordBarColor =
    passwordStrength === "forte"
      ? "bg-tegra-success"
      : passwordStrength === "media"
        ? "bg-yellow-500"
        : "bg-tegra-error";

  function resetCreateUserForm() {
    setNewUserForm({
      nome: "",
      email: "",
      senha: "",
      confirmarSenha: "",
      tipo: "Consultor",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function handleOpenCreateModal() {
    resetCreateUserForm();
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreatingUser) return;
    setIsCreateModalOpen(false);
    resetCreateUserForm();
  }

  function openEditModal(usuario) {
    const tipoRaw = (usuario.tipo || "Consultor").trim();
    const tipoValid = userTypes.includes(tipoRaw) ? tipoRaw : "Consultor";
    setEditingUserId(usuario.id);
    setEditUserForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      tipo: tipoValid,
      senha: "",
      confirmarSenha: "",
    });
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    if (isSavingEdit) return;
    setIsEditModalOpen(false);
    setEditingUserId(null);
    setEditUserForm({
      nome: "",
      email: "",
      tipo: "Consultor",
      senha: "",
      confirmarSenha: "",
    });
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
  }

  const editPasswordChecks = {
    minLength: editUserForm.senha.length >= 8,
    uppercase: /[A-Z]/.test(editUserForm.senha),
    lowercase: /[a-z]/.test(editUserForm.senha),
    number: /\d/.test(editUserForm.senha),
    special: /[^A-Za-z0-9]/.test(editUserForm.senha),
  };
  const editPassedChecks = Object.values(editPasswordChecks).filter(Boolean).length;
  const editStrengthPercentage =
    editUserForm.senha.length > 0 ? (editPassedChecks / 5) * 100 : 0;
  const editPasswordStrength =
    editUserForm.senha.length === 0
      ? ""
      : editPassedChecks <= 2
        ? "fraca"
        : editPassedChecks <= 4
          ? "media"
          : "forte";
  const editPasswordRequirementsText = [
    !editPasswordChecks.minLength ? "pelo menos 8 caracteres" : null,
    !editPasswordChecks.uppercase ? "1 letra maiúscula" : null,
    !editPasswordChecks.lowercase ? "1 letra minúscula" : null,
    !editPasswordChecks.number ? "1 número" : null,
    !editPasswordChecks.special ? "1 caractere especial" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const editPasswordBarColor =
    editUserForm.senha.length === 0
      ? "bg-tegra-gray-light"
      : editPasswordStrength === "forte"
        ? "bg-tegra-success"
        : editPasswordStrength === "media"
          ? "bg-yellow-500"
          : "bg-tegra-error";

  function validateEditUserForm() {
    const nome = editUserForm.nome.trim();
    const email = editUserForm.email.trim().toLowerCase();
    const senha = editUserForm.senha;
    const confirmarSenha = editUserForm.confirmarSenha;

    if (!nome || !email || !editUserForm.tipo.trim()) {
      showToast("❌ Nome, e-mail e tipo são obrigatórios", "error");
      return false;
    }

    if (!email.includes("@") || !email.includes(".")) {
      showToast("❌ O e-mail deve ser válido (conter @ e .)", "error");
      return false;
    }

    if (senha || confirmarSenha) {
      if (editPasswordRequirementsText) {
        showToast("❌ A nova senha não atende aos critérios mínimos", "error");
        return false;
      }
      if (senha !== confirmarSenha) {
        showToast("❌ As senhas devem coincidir", "error");
        return false;
      }
    }

    return true;
  }

  async function handleSubmitEdit(e) {
    e.preventDefault();
    if (!editingUserId || !validateEditUserForm()) return;

    try {
      setIsSavingEdit(true);
      setLoading(true);
      const payload = {
        nome: editUserForm.nome.trim(),
        email: editUserForm.email.trim().toLowerCase(),
        tipo: editUserForm.tipo.trim(),
        senha: editUserForm.senha.trim() || undefined,
      };
      const response = await usersService.updateUser(editingUserId, payload);
      if (response.success) {
        showToast("✅ Usuário atualizado com sucesso", "success");
        handleCloseEditModal();
        await fetchUsers(false);
      }
    } catch (error) {
      if (error.status === 409) {
        showToast("❌ Este e-mail já está em uso", "error");
      } else if (error.status === 403 && error.code === "TIPO_NAO_ADMIN") {
        showToast(
          `❌ Sem permissão (tipo no banco: ${error.tipoLido ?? "—"}).`,
          "error",
          6000,
        );
      } else {
        showToast(error.error || "❌ Erro ao atualizar usuário", "error");
      }
    } finally {
      setIsSavingEdit(false);
      setLoading(false);
    }
  }

  function validateCreateUserForm() {
    const nome = newUserForm.nome.trim();
    const email = newUserForm.email.trim().toLowerCase();
    const senha = newUserForm.senha;
    const confirmarSenha = newUserForm.confirmarSenha;

    if (!nome || !email || !senha || !confirmarSenha || !newUserForm.tipo.trim()) {
      showToast("❌ Os campos não podem ser vazios", "error");
      return false;
    }

    if (!email.includes("@") || !email.includes(".")) {
      showToast("❌ O e-mail deve ser válido (conter @ e .)", "error");
      return false;
    }

    if (passwordRequirementsText) {
      showToast("❌ A senha não atende aos critérios mínimos", "error");
      return false;
    }

    if (senha !== confirmarSenha) {
      showToast("❌ As senhas devem coincidir", "error");
      return false;
    }

    return true;
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!validateCreateUserForm()) return;

    try {
      setIsCreatingUser(true);
      setLoading(true);
      const payload = {
        nome: newUserForm.nome.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        senha: newUserForm.senha,
        tipo: newUserForm.tipo.trim(),
      };
      const response = await usersService.createUser(payload);

      if (response.success) {
        showToast("✅ Usuário criado com sucesso", "success");
        handleCloseCreateModal();
        await fetchUsers(false);
        navigate(ROUTES.USUARIOS, { replace: true });
      }
    } catch (error) {
      if (error.status === 409) {
        showToast("❌ Este e-mail já está cadastrado", "error");
      } else if (error.status === 403 && error.code === "TIPO_NAO_ADMIN") {
        showToast(
          `❌ Seu perfil no banco não está como Admin (tipo atual: ${error.tipoLido ?? "—"}).`,
          "error",
          6000,
        );
      } else {
        showToast(error.error || "❌ Erro ao criar usuário", "error");
      }
    } finally {
      setIsCreatingUser(false);
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <UsersFilterDrawer
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
        panelClassName="max-h-[90vh] overflow-y-auto"
      >
            <div className="flex items-center justify-between px-5 py-4 border-b border-tegra-gray-medium">
              <h2 className="text-lg sm:text-xl font-bold text-tegra-text-primary">
                Criar usuário
              </h2>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-tegra-text-secondary hover:text-tegra-text-primary transition"
                disabled={isCreatingUser}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="px-5 py-4 space-y-4">
              <Input
                label="Nome"
                value={newUserForm.nome}
                onChange={(e) =>
                  setNewUserForm((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="Nome completo"
                disabled={isCreatingUser}
              />

              <Input
                label="Email"
                type="email"
                value={newUserForm.email}
                onChange={(e) =>
                  setNewUserForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@dominio.com"
                disabled={isCreatingUser}
              />

              <div>
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  value={newUserForm.senha}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, senha: e.target.value }))
                  }
                  placeholder="Digite uma senha forte"
                  disabled={isCreatingUser}
                  iconRight={
                    showPassword ? (
                      <MdVisibilityOff className="text-xl" />
                    ) : (
                      <MdVisibility className="text-xl" />
                    )
                  }
                  onIconClick={() => setShowPassword((prev) => !prev)}
                />
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-tegra-gray-light overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordBarColor}`}
                      style={{ width: `${strengthPercentage}%` }}
                    />
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      passwordStrength === "forte"
                        ? "text-tegra-success"
                        : passwordStrength === "media"
                          ? "text-yellow-600"
                          : "text-tegra-error"
                    }`}
                  >
                    Força da senha: {passwordStrength}
                  </p>
                  <p className="mt-1 text-xs text-tegra-text-secondary">
                    {passwordRequirementsText
                      ? `Falta: ${passwordRequirementsText}`
                      : "Senha atende a todos os critérios"}
                  </p>
                </div>
              </div>

              <Input
                label="Confirmar senha"
                type={showConfirmPassword ? "text" : "password"}
                value={newUserForm.confirmarSenha}
                onChange={(e) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    confirmarSenha: e.target.value,
                  }))
                }
                placeholder="Repita a senha"
                disabled={isCreatingUser}
                iconRight={
                  showConfirmPassword ? (
                    <MdVisibilityOff className="text-xl" />
                  ) : (
                    <MdVisibility className="text-xl" />
                  )
                }
                onIconClick={() => setShowConfirmPassword((prev) => !prev)}
              />

              <div>
                <label className="block text-xs sm:text-sm font-medium text-tegra-text-secondary mb-1.5 sm:mb-2">
                  Tipo
                </label>
                <Select
                  instanceId="users-create-tipo"
                  options={tipoSelectOptions}
                  value={
                    tipoSelectOptions.find((o) => o.value === newUserForm.tipo) ||
                    tipoSelectOptions[0]
                  }
                  onChange={(opt) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      tipo: opt?.value ?? "Consultor",
                    }))
                  }
                  isDisabled={isCreatingUser}
                  styles={modalSelectStyles}
                  components={{ Menu: TegraAnimatedMenu }}
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : null
                  }
                  menuPosition="fixed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseCreateModal}
                  disabled={isCreatingUser}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={isCreatingUser} variant="primary">
                  Criar usuário
                </Button>
              </div>
            </form>
      </AnimatedModal>

      <AnimatedModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        panelClassName="max-h-[90vh] overflow-y-auto"
      >
            <div className="flex items-center justify-between px-5 py-4 border-b border-tegra-gray-medium">
              <h2 className="text-lg sm:text-xl font-bold text-tegra-text-primary">
                Editar usuário
              </h2>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-tegra-text-secondary hover:text-tegra-text-primary transition"
                disabled={isSavingEdit}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="px-5 py-4 space-y-4">
              <Input
                label="Nome"
                value={editUserForm.nome}
                onChange={(e) =>
                  setEditUserForm((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="Nome completo"
                disabled={isSavingEdit}
              />

              <Input
                label="Email"
                type="email"
                value={editUserForm.email}
                onChange={(e) =>
                  setEditUserForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@dominio.com"
                disabled={isSavingEdit}
              />

              <div>
                <Input
                  label="Nova senha (opcional)"
                  type={showEditPassword ? "text" : "password"}
                  value={editUserForm.senha}
                  onChange={(e) =>
                    setEditUserForm((prev) => ({ ...prev, senha: e.target.value }))
                  }
                  placeholder="Deixe em branco para manter a senha atual"
                  disabled={isSavingEdit}
                  iconRight={
                    showEditPassword ? (
                      <MdVisibilityOff className="text-xl" />
                    ) : (
                      <MdVisibility className="text-xl" />
                    )
                  }
                  onIconClick={() => setShowEditPassword((prev) => !prev)}
                />
                {editUserForm.senha.length > 0 && (
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-tegra-gray-light overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${editPasswordBarColor}`}
                        style={{ width: `${editStrengthPercentage}%` }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        editPasswordStrength === "forte"
                          ? "text-tegra-success"
                          : editPasswordStrength === "media"
                            ? "text-yellow-600"
                            : "text-tegra-error"
                      }`}
                    >
                      Força da senha: {editPasswordStrength}
                    </p>
                    <p className="mt-1 text-xs text-tegra-text-secondary">
                      {editPasswordRequirementsText
                        ? `Falta: ${editPasswordRequirementsText}`
                        : "Senha atende a todos os critérios"}
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Confirmar nova senha"
                type={showEditConfirmPassword ? "text" : "password"}
                value={editUserForm.confirmarSenha}
                onChange={(e) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    confirmarSenha: e.target.value,
                  }))
                }
                placeholder="Repita a nova senha"
                disabled={isSavingEdit}
                iconRight={
                  showEditConfirmPassword ? (
                    <MdVisibilityOff className="text-xl" />
                  ) : (
                    <MdVisibility className="text-xl" />
                  )
                }
                onIconClick={() => setShowEditConfirmPassword((prev) => !prev)}
              />

              <div>
                <label className="block text-xs sm:text-sm font-medium text-tegra-text-secondary mb-1.5 sm:mb-2">
                  Tipo
                </label>
                <Select
                  instanceId="users-edit-tipo"
                  options={tipoSelectOptions}
                  value={
                    tipoSelectOptions.find((o) => o.value === editUserForm.tipo) ||
                    tipoSelectOptions[0]
                  }
                  onChange={(opt) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      tipo: opt?.value ?? "Consultor",
                    }))
                  }
                  isDisabled={isSavingEdit}
                  styles={modalSelectStyles}
                  components={{ Menu: TegraAnimatedMenu }}
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : null
                  }
                  menuPosition="fixed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseEditModal}
                  disabled={isSavingEdit}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={isSavingEdit} variant="primary">
                  Salvar alterações
                </Button>
              </div>
            </form>
      </AnimatedModal>

      {/* Overlay de loading ao buscar usuário */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Cabeçalho */}
        <div className="mb-4 space-y-3 sm:mb-6">
          <div className="flex w-full items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">
              Usuários
            </h1>
            {isAdmin && (
              <Button type="button" variant="primary" onClick={handleOpenCreateModal}>
                <span className="inline-flex items-center gap-1.5">
                  <MdAdd className="text-lg" />
                  Adicionar
                </span>
              </Button>
            )}
          </div>

          {/* Barra de busca e filtro (abaixo do botão) */}
          <div className="flex w-full items-center justify-end gap-2">
            <div className="flex-1 sm:flex-initial sm:w-64">
              <Input
                label=""
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                iconRight={<MdSearch className="text-xl" />}
                onIconClick={(e) => {
                  e.preventDefault();
                  flushSearch(e);
                }}
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
              className="relative p-2 border-2 border-tegra-blue-dark rounded-lg text-tegra-blue-dark hover:bg-tegra-blue-light transition"
              title="Filtrar"
              aria-label="Abrir filtros"
            >
              <MdFilterList className="text-lg sm:text-xl" />
              {(appliedFilters.status !== "all" ||
                appliedFilters.createdFrom ||
                appliedFilters.createdTo ||
                appliedFilters.modifiedFrom ||
                appliedFilters.modifiedTo) && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-tegra-teal ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>

        {/* Tabela/Cards */}
        <div className="bg-tegra-bg-primary rounded-lg shadow-md overflow-hidden">
          {localLoading && usuarios.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-tegra-text-secondary text-sm sm:text-base">
              Carregando usuários...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-tegra-text-secondary text-sm sm:text-base">
              Nenhum usuário encontrado
            </div>
          ) : (
            <>
              {/* Versão Mobile: Cards */}
              <div className="md:hidden">
                <div className="p-3 space-y-3">
                  {usuarios.map((usuario) => {
                    const criado = formatDate(usuario.criado);
                    const modificado = formatDate(usuario.modificado);

                    // Garante que status seja sempre string
                    let status = "inativo";
                    if (typeof usuario.status === "string") {
                      status =
                        usuario.status.toLowerCase() === "ativo" ||
                        usuario.status.toLowerCase() === "active"
                          ? "ativo"
                          : "inativo";
                    } else if (typeof usuario.status === "boolean") {
                      status = usuario.status ? "ativo" : "inativo";
                    } else {
                      status = "inativo";
                    }

                    return (
                      <div
                        key={usuario.id}
                        className="bg-white border border-tegra-gray-medium rounded-lg p-4 shadow-sm"
                      >
                        {/* Cabeçalho do card: Avatar + Nome + Status */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar
                              user={usuario.raw || usuario}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-tegra-text-primary truncate">
                                {usuario.nome || "Sem nome"}
                              </h3>
                              <p className="text-xs text-tegra-text-secondary truncate">
                                {usuario.email || "Sem email"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              status === "ativo"
                                ? "bg-tegra-success-light text-tegra-success"
                                : "bg-tegra-error-light text-tegra-error"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {/* Informações adicionais */}
                        <div className="space-y-2 mb-3 text-xs text-tegra-text-secondary">
                          {criado.date !== "-" && (
                            <div className="flex items-center gap-2">
                              <span>Criado:</span>
                              <span className="text-tegra-text-primary">
                                {criado.date}
                                {criado.time && ` ${criado.time}`}
                              </span>
                            </div>
                          )}
                          {modificado.date !== "-" && (
                            <div className="flex items-center gap-2">
                              <span>Modificado:</span>
                              <span className="text-tegra-text-primary">
                                {modificado.date}
                                {modificado.time && ` ${modificado.time}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-tegra-gray-medium">
                          <button
                            type="button"
                            onClick={() => openEditModal(usuario)}
                            className="p-2 text-tegra-blue-dark hover:bg-tegra-blue-light rounded transition"
                            title="Editar"
                            aria-label="Editar usuário"
                          >
                            <MdEdit className="text-lg" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(usuario)}
                            className={`p-2 rounded transition ${
                              status === "ativo"
                                ? "text-tegra-success hover:bg-tegra-success-light"
                                : "text-tegra-error hover:bg-tegra-error-light"
                            }`}
                            title={
                              status === "ativo"
                                ? "Desativar usuário"
                                : "Ativar usuário"
                            }
                            aria-label={
                              status === "ativo"
                                ? "Desativar usuário"
                                : "Ativar usuário"
                            }
                          >
                            {status === "ativo" ? (
                              <MdLockOpen className="text-lg" />
                            ) : (
                              <MdLock className="text-lg" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Versão Desktop: Tabela */}
              <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full">
                    {/* Cabeçalho da tabela */}
                    <thead>
                      <tr className="bg-tegra-blue-dark text-tegra-text-inverse">
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold">
                          Usuário
                        </th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold">
                          Status
                        </th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold">
                          Criado
                        </th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold hidden lg:table-cell">
                          Modificado
                        </th>
                        <th className="px-4 md:px-6 py-4 text-center text-sm font-bold">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    {/* Corpo da tabela */}
                    <tbody>
                      {usuarios.map((usuario) => {
                        const criado = formatDate(usuario.criado);
                        const modificado = formatDate(usuario.modificado);

                        // Garante que status seja sempre string
                        let status = "inativo";
                        if (typeof usuario.status === "string") {
                          status =
                            usuario.status.toLowerCase() === "ativo" ||
                            usuario.status.toLowerCase() === "active"
                              ? "ativo"
                              : "inativo";
                        } else if (typeof usuario.status === "boolean") {
                          status = usuario.status ? "ativo" : "inativo";
                        } else {
                          status = "inativo";
                        }

                        return (
                          <tr
                            key={usuario.id}
                            className="border-b border-tegra-gray-medium hover:bg-tegra-gray-light transition"
                          >
                            {/* Usuário com Avatar */}
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  user={usuario.raw || usuario}
                                  size="sm"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-tegra-text-primary">
                                    {usuario.nome || "Sem nome"}
                                  </span>
                                  <span className="text-xs text-tegra-text-secondary">
                                    {usuario.email || "Sem email"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 md:px-6 py-4">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                  status === "ativo"
                                    ? "bg-tegra-success-light text-tegra-success"
                                    : "bg-tegra-error-light text-tegra-error"
                                }`}
                              >
                                {status}
                              </span>
                            </td>

                            {/* Criado */}
                            <td className="px-4 md:px-6 py-4 text-sm text-tegra-text-primary">
                              <div className="flex flex-col">
                                <span>{criado.date}</span>
                                {criado.time && (
                                  <span className="text-xs text-tegra-text-secondary">
                                    {criado.time}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Modificado */}
                            <td className="px-4 md:px-6 py-4 text-sm text-tegra-text-primary hidden lg:table-cell">
                              <div className="flex flex-col">
                                <span>{modificado.date}</span>
                                {modificado.time && (
                                  <span className="text-xs text-tegra-text-secondary">
                                    {modificado.time}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Ações */}
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(usuario)}
                                  className="p-2 text-tegra-blue-dark hover:bg-tegra-blue-light rounded transition"
                                  title="Editar"
                                  aria-label="Editar usuário"
                                >
                                  <MdEdit className="text-lg" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(usuario)}
                                  className={`p-2 rounded transition ${
                                    status === "ativo"
                                      ? "text-tegra-success hover:bg-tegra-success-light"
                                      : "text-tegra-error hover:bg-tegra-error-light"
                                  }`}
                                  title={
                                    status === "ativo"
                                      ? "Desativar usuário"
                                      : "Ativar usuário"
                                  }
                                  aria-label={
                                    status === "ativo"
                                      ? "Desativar usuário"
                                      : "Ativar usuário"
                                  }
                                >
                                  {status === "ativo" ? (
                                    <MdLockOpen className="text-lg" />
                                  ) : (
                                    <MdLock className="text-lg" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginação - Sempre exibida quando há dados */}
              {usuarios.length > 0 && (
                <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-tegra-gray-medium flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-tegra-blue-dark font-medium">
                    Página {pagination.page} de {pagination.totalPages || 1}
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Primeira página"
                    >
                      <MdFirstPage className="text-lg sm:text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Página anterior"
                    >
                      <MdChevronLeft className="text-lg sm:text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Próxima página"
                    >
                      <MdChevronRight className="text-lg sm:text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={currentPage === pagination.totalPages}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
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
