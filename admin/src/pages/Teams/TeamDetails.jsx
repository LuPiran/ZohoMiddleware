import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MdArrowBack, MdSearch } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { teamsService } from "../../services/teams";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";

function UserCard({ user }) {
  return (
    <div className="rounded-lg border border-tegra-gray-medium bg-tegra-bg-primary p-3">
      <div className="flex items-center gap-3">
        <Avatar user={user} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-tegra-text-primary">{user?.nome || "-"}</p>
          <p className="truncate text-xs text-tegra-text-secondary">{user?.email || "-"}</p>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadTeam = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await teamsService.getTeamById(id, { search: debouncedSearch });
      setTeam(response.data);
    } catch (error) {
      showToast(`Erro|${error.message || "Não foi possível carregar equipe"}`, "error");
      navigate(ROUTES.EQUIPES);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, id, navigate, showToast]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-xl font-bold text-tegra-text-primary sm:text-2xl">
            {team?.nome || "Equipe"}
          </h1>
          <div className="w-full sm:w-80">
            <Input
              label=""
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar consultor..."
              iconRight={<MdSearch className="text-xl" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg bg-tegra-bg-primary p-8 text-center text-tegra-text-secondary">
            Carregando equipe...
          </div>
        ) : !team ? (
          <div className="rounded-lg bg-tegra-bg-primary p-8 text-center text-tegra-text-secondary">
            Equipe não encontrada
          </div>
        ) : (
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tegra-text-secondary">
                Gerente
              </p>
              {team.gerente ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <UserCard user={team.gerente} />
                </motion.div>
              ) : (
                <div className="rounded-lg border border-tegra-gray-medium bg-tegra-bg-primary p-4 text-sm text-tegra-text-secondary">
                  Nenhum gerente vinculado.
                </div>
              )}
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tegra-text-secondary">
                Consultores da equipe
              </p>
              {team.consultores?.length ? (
                <div className="space-y-3">
                  <div
                    className={`space-y-3 pr-1 ${
                      team.consultores.length > 5 ? "max-h-[360px] overflow-y-auto" : ""
                    }`}
                  >
                    {team.consultores.map((consultor, index) => (
                      <motion.div
                        key={consultor.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                      >
                        <UserCard user={consultor} />
                      </motion.div>
                    ))}
                  </div>
                  {team.consultores.length > 5 && (
                    <p className="text-xs text-tegra-text-secondary">
                      Exibindo lista com rolagem ({team.consultores.length} consultores).
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-tegra-gray-medium bg-tegra-bg-primary p-4 text-sm text-tegra-text-secondary">
                  Nenhum consultor encontrado.
                </div>
              )}
            </section>

            <div className="pt-2">
              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.EQUIPES)}>
                  <span className="inline-flex items-center gap-1">
                    <MdArrowBack className="text-lg" /> Voltar
                  </span>
                </Button>
              </div>
            </div>

          </div>
        )}
      </div>
    </MainLayout>
  );
}

