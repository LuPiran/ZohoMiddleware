import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { leadsMedicosService } from "../services/leadsMedicos";
import { ROUTES } from "../utils/constants";
import { useToast } from "../components/feedback/auth/ToastContainer";

const POLL_MS = 20_000;

const SlaOfferContext = createContext(null);

export function SlaOfferProvider({ children }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const busyRef = useRef(false);
  const autoShownRef = useRef(new Set()); // IDs já exibidos automaticamente

  const dismissOffer = useCallback((offerId) => {
    if (!offerId) return;
    setOffers((prev) => prev.filter((item) => item.id !== offerId));
    setSelectedOffer((current) => (current?.id === offerId ? null : current));
  }, []);

  useEffect(() => {
    function onOptimisticRefuse(event) {
      dismissOffer(event.detail?.id);
    }
    window.addEventListener("sla-offer-optimistic-refuse", onOptimisticRefuse);
    return () =>
      window.removeEventListener("sla-offer-optimistic-refuse", onOptimisticRefuse);
  }, [dismissOffer]);

  const loadOffers = useCallback(async () => {
    if (busyRef.current) return;
    try {
      const result = await leadsMedicosService.listPendingOffers();
      const next = Array.isArray(result.data) ? result.data : [];
      setOffers(next);

      setSelectedOffer((current) => {
        // Se já tem modal aberto, mantém (atualiza dados se ainda existir na fila)
        if (current) {
          return next.find((item) => item.id === current.id) || null;
        }
        // Abre automaticamente a primeira oferta nova (ainda não exibida)
        const newOffer = next.find((o) => !autoShownRef.current.has(o.id));
        if (newOffer) {
          autoShownRef.current.add(newOffer.id);
          return newOffer;
        }
        return null;
      });
    } catch {
      // polling silencioso
    }
  }, []);

  useEffect(() => {
    loadOffers();
    const id = setInterval(loadOffers, POLL_MS);
    return () => clearInterval(id);
  }, [loadOffers]);

  const notifyChanged = (id, action) => {
    window.dispatchEvent(
      new CustomEvent("sla-offer-changed", { detail: { id, action } }),
    );
  };

  const acceptOffer = useCallback(
    async (offer) => {
      if (!offer?.id || busyRef.current) return false;
      setSubmittingId(offer.id);
      busyRef.current = true;
      try {
        await leadsMedicosService.aceitarOferta(offer.id);
        showToast("Lead aceito. Ele entrou na sua carteira.", "success", 2800);
        notifyChanged(offer.id, "aceitar");
        const path = `/leads-medicos/${offer.id}`;
        if (location.pathname !== path) navigate(path);
        setSelectedOffer(null);
        await loadOffers();
        return true;
      } catch (err) {
        const message =
          err?.response?.data?.error || err?.message || "Não foi possível aceitar.";
        showToast(message, "error", 3500);
        await loadOffers();
        return false;
      } finally {
        busyRef.current = false;
        setSubmittingId(null);
      }
    },
    [loadOffers, location.pathname, navigate, showToast],
  );

  const refuseOffer = useCallback(
    async (offer) => {
      if (!offer?.id || busyRef.current) return false;
      const offerId = offer.id;

      dismissOffer(offerId);

      if (location.pathname === `/leads-medicos/${offerId}`) {
        navigate(ROUTES.LEADS_MEDICOS);
      }

      setSubmittingId(offerId);
      busyRef.current = true;
      try {
        await leadsMedicosService.recusarOferta(offerId);
        showToast("Oferta recusada. O lead segue para o próximo consultor.", "success", 2800);
        notifyChanged(offerId, "recusar");
        void loadOffers();
        return true;
      } catch (err) {
        const message =
          err?.response?.data?.error || err?.message || "Não foi possível recusar.";
        showToast(message, "error", 3500);
        await loadOffers();
        return false;
      } finally {
        busyRef.current = false;
        setSubmittingId(null);
      }
    },
    [dismissOffer, loadOffers, location.pathname, navigate, showToast],
  );

  const value = useMemo(
    () => ({
      offers,
      selectedOffer,
      submittingId,
      openOffer: setSelectedOffer,
      closeOffer: () => setSelectedOffer(null),
      acceptOffer,
      refuseOffer,
      refreshOffers: loadOffers,
    }),
    [acceptOffer, loadOffers, offers, refuseOffer, selectedOffer, submittingId],
  );

  return (
    <SlaOfferContext.Provider value={value}>{children}</SlaOfferContext.Provider>
  );
}

export function useSlaOffers() {
  const ctx = useContext(SlaOfferContext);
  if (!ctx) {
    throw new Error("useSlaOffers deve ser usado dentro de SlaOfferProvider");
  }
  return ctx;
}
