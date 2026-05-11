import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Select from "react-select";
import {
  MdAdd,
  MdChevronLeft,
  MdChevronRight,
  MdDelete,
  MdEdit,
  MdFirstPage,
  MdLastPage,
  MdSearch,
} from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import AnimatedModal from "../../components/ui/AnimatedModal";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { teamsService } from "../../services/teams";
import { ROUTES } from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { getTegraSelectStyles } from "../../utils/reactSelectTegraStyles";
import { TegraAnimatedMenu } from "../../components/ui/TegraAnimatedMenu";

const PER_PAGE = 10;

function SelectTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-tegra-blue-dark/30 bg-tegra-blue-light/20 px-2.5 py-1 text-xs text-tegra-blue-dark">
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full px-1 text-tegra-blue-dark hover:bg-tegra-blue-light/40"
        aria-label="Remover seleção"
      >
        ×
      </button>
    </span>
  );
}

function TeamFormModal({
  open,
  title,
  loading,
  managers,
  consultants,
  initial,
  onClose,
  onSubmit,
}) {
  const [nome, setNome] = useState("");
  const [gerente, setGerente] = useState(null);
  const [integrantes, setIntegrantes] = useState([]);

  useEffect(() => {
    if (!open) return;
    setNome(initial?.nome || "");
    setGerente(initial?.gerente || null);
    setIntegrantes(initial?.consultores || []);
  }, [open, initial]);

  const selectedConsultorIds = useMemo(
    () => new Set(integrantes.map((c) => c.id)),
    [integrantes],
  );
  const selectStyles = useMemo(
    () => getTegraSelectStyles({ menuPortalZIndex: 10000 }),
    [],
  );
  const managerOptions = useMemo(
    () =>
      managers.map((m) => ({
        value: m.id,
        label: `${m.nome} - ${m.email}`,
        raw: m,
      })),
    [managers],
  );

  const availableConsultants = consultants.filter((c) => !selectedConsultorIds.has(c.id));
  const consultantOptions = useMemo(
    () =>
      availableConsultants.map((c) => ({
        value: c.id,
        label: `${c.nome} - ${c.email}`,
        raw: c,
      })),
    [availableConsultants],
  );

  return (
    <AnimatedModal open={open} onClose={onClose} panelClassName="max-h-[90vh] overflow-y-auto">
      <div className="border-b border-tegra-gray-medium px-5 py-4">
        <h2 className="text-lg font-bold text-tegra-text-primary">{title}</h2>
      </div>
      <form
        className="space-y-4 px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ nome, gerenteId: gerente?.id || null, consultorIds: integrantes.map((c) => c.id) });
        }}
      >
        <Input
          label="Nome da equipe"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Equipe Sudeste"
          disabled={loading}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-tegra-text-secondary">Gerente</label>
          {!gerente ? (
            <Select
              instanceId="teams-manager"
              placeholder="Selecione um gerente"
              options={managerOptions}
              value={null}
              onChange={(opt) => {
                if (opt?.raw) setGerente(opt.raw);
              }}
              styles={selectStyles}
              components={{ Menu: TegraAnimatedMenu }}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="fixed"
              disabled={loading}
            />
          ) : (
            <SelectTag label={`${gerente.nome} (${gerente.email})`} onRemove={() => setGerente(null)} />
          )}
        </div>

        {gerente && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-tegra-text-secondary">
              Consultores
            </label>
            <Select
              instanceId="teams-consultants"
              placeholder="Selecione consultores"
              options={consultantOptions}
              value={null}
              onChange={(opt) => {
                if (opt?.raw) setIntegrantes((prev) => [...prev, opt.raw]);
              }}
              styles={selectStyles}
              components={{ Menu: TegraAnimatedMenu }}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="fixed"
              disabled={loading}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {integrantes.map((c) => (
                <SelectTag
                  key={c.id}
                  label={`${c.nome} (${c.email})`}
                  onRemove={() => setIntegrantes((prev) => prev.filter((item) => item.id !== c.id))}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Salvar
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default function Teams() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isAdmin = hasAdminPanelPermission();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, perPage: PER_PAGE });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [availableConsultants, setAvailableConsultants] = useState([]);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 280);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await teamsService.getTeams({
        page,
        perPage: PER_PAGE,
        search: isAdmin ? debouncedSearch : "",
      });
      setTeams(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      showToast(`Erro|${error.message || "Não foi possível carregar equipes"}`, "error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isAdmin, page, showToast]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  async function openCreateModal() {
    try {
      const [managers, consultants] = await Promise.all([
        teamsService.getAvailableManagers(),
        teamsService.getAvailableConsultants(),
      ]);
      setAvailableManagers(managers);
      setAvailableConsultants(consultants);
      setEditing(null);
      setIsFormOpen(true);
    } catch (error) {
      showToast(`Erro|${error.message || "Não foi possível carregar opções do formulário"}`, "error");
    }
  }

  async function openEditModal(team) {
    try {
      const [managers, consultants] = await Promise.all([
        teamsService.getAvailableManagers({ excludeTeamId: team.id }),
        teamsService.getAvailableConsultants({ excludeTeamId: team.id }),
      ]);
      const gerenteAtual = team.gerente;
      const consultoresAtuais = team.consultores || [];
      const managersWithCurrent = gerenteAtual
        ? [gerenteAtual, ...managers.filter((m) => m.id !== gerenteAtual.id)]
        : managers;

      setAvailableManagers(managersWithCurrent);
      setAvailableConsultants([
        ...consultoresAtuais,
        ...consultants.filter((c) => !consultoresAtuais.some((x) => x.id === c.id)),
      ]);
      setEditing(team);
      setIsFormOpen(true);
    } catch (error) {
      showToast(`Erro|${error.message || "Não foi possível preparar edição da equipe"}`, "error");
    }
  }

  async function handleSave(payload) {
    const nome = String(payload.nome || "").trim();
    if (!nome) {
      showToast("Atenção|Os campos não podem ser vazios.", "warning");
      return;
    }
    if (!payload.gerenteId || payload.consultorIds.length < 1) {
      showToast("Atenção|A equipe deve ter pelo menos 1 gerência e 1 integrante.", "warning");
      return;
    }

    try {
      setIsSaving(true);
      if (editing?.id) {
        await teamsService.updateTeam(editing.id, payload);
        showToast("Concluído|Equipe atualizada com sucesso.", "success");
      } else {
        await teamsService.createTeam(payload);
        showToast("Concluído|Equipe criada com sucesso.", "success");
      }
      setIsFormOpen(false);
      setEditing(null);
      await loadTeams();
    } catch (error) {
      showToast(`Erro|${error.message || "Não foi possível salvar equipe"}`, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(team) {
    setPendingDeleteTeam(team);
  }

  async function confirmDeleteTeam() {
    if (!pendingDeleteTeam?.id) return;
    try {
      setIsDeleting(true);
      await teamsService.deleteTeam(pendingDeleteTeam.id);
      showToast("Concluído|Equipe removida com sucesso.", "success");
      setPendingDeleteTeam(null);
      await loadTeams();
    } catch (error) {
      showToast(`Erro|${error.message || "Não foi possível deletar equipe"}`, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <MainLayout>
      <TeamFormModal
        open={isFormOpen}
        title={editing ? "Editar equipe" : "Criar equipe"}
        loading={isSaving}
        managers={availableManagers}
        consultants={availableConsultants}
        initial={{
          nome: editing?.nome || "",
          gerente: editing?.gerente || null,
          consultores: editing?.consultores || [],
        }}
        onClose={() => !isSaving && setIsFormOpen(false)}
        onSubmit={handleSave}
      />

      {createPortal(
        <AnimatePresence>
          {pendingDeleteTeam && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-4 top-24 z-[100001] w-[calc(100vw-2rem)] max-w-[390px] rounded-xl border-l-[3px] border-tegra-warning bg-white p-4 shadow-[0_8px_24px_rgba(26,47,91,0.10),0_2px_8px_rgba(26,47,91,0.06)]"
            >
              <p className="text-sm font-semibold text-tegra-text-primary">Confirmar exclusão</p>
              <p className="mt-1 text-xs leading-relaxed text-tegra-text-secondary">
                Deseja deletar a equipe: <span className="font-semibold">{pendingDeleteTeam.nome}</span>?
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPendingDeleteTeam(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={confirmDeleteTeam}
                  loading={isDeleting}
                >
                  Sim
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mb-5 space-y-3 sm:mb-6">
          <div className="flex w-full items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-tegra-text-primary sm:text-2xl">
              {isAdmin ? "Equipes" : "Minha equipe"}
            </h1>
            {isAdmin && (
              <Button type="button" variant="primary" onClick={openCreateModal}>
                <span className="inline-flex items-center gap-1.5">
                  <MdAdd className="text-lg" />
                  Adicionar
                </span>
              </Button>
            )}
          </div>
          {isAdmin && (
            <div className="flex w-full justify-end">
              <div className="w-full sm:w-80">
              <Input
                label=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar equipe..."
                iconRight={<MdSearch className="text-xl" />}
              />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-lg bg-tegra-bg-primary p-8 text-center text-tegra-text-secondary">
            Carregando equipes...
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-lg bg-tegra-bg-primary p-8 text-center text-tegra-text-secondary">
            Nenhuma equipe encontrada
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {teams.map((team) => (
                <motion.article
                  key={team.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border border-tegra-gray-medium bg-tegra-bg-primary p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-tegra-text-primary">{team.nome}</h2>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(team)}
                          className="rounded p-2 text-tegra-blue-dark transition hover:bg-tegra-blue-light"
                          aria-label="Editar equipe"
                        >
                          <MdEdit className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team)}
                          className="rounded p-2 text-tegra-error transition hover:bg-tegra-error-light"
                          aria-label="Deletar equipe"
                        >
                          <MdDelete className="text-lg" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg border border-tegra-gray-medium/70 bg-white/60 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-tegra-text-secondary">Gerente</p>
                    {team.gerente ? (
                      <div className="flex items-center gap-3">
                        <Avatar user={team.gerente} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-tegra-text-primary">
                            {team.gerente.nome}
                          </p>
                          <p className="truncate text-xs text-tegra-text-secondary">
                            {team.gerente.email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-tegra-text-secondary">Sem gerente vinculado</p>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-tegra-text-secondary">
                    Integrantes: <span className="font-semibold text-tegra-text-primary">{team.integrantesCount}</span>
                  </p>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(`${ROUTES.EQUIPES}/${team.id}`)}
                      className="text-sm font-semibold text-tegra-blue-dark underline-offset-4 transition hover:text-tegra-teal hover:underline"
                    >
                      Ver equipe
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-tegra-gray-medium px-1 pt-4 sm:flex-row">
              <div className="text-sm font-medium text-tegra-blue-dark">
                Página {pagination.page} de {pagination.totalPages || 1}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Primeira página"
                >
                  <MdFirstPage className="text-xl" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Página anterior"
                >
                  <MdChevronLeft className="text-xl" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
                  disabled={page >= (pagination.totalPages || 1)}
                  className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Próxima página"
                >
                  <MdChevronRight className="text-xl" />
                </button>
                <button
                  onClick={() => setPage(pagination.totalPages || 1)}
                  disabled={page >= (pagination.totalPages || 1)}
                  className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Última página"
                >
                  <MdLastPage className="text-xl" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

