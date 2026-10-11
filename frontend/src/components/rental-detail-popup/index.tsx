import { Clock, Trash2, Edit3 } from 'lucide-react';
import { CloseButton } from '../buttons/close-button';
import { RentalDetailHeader } from './components/header';
import { DetailGrid } from './components/detail-grid';
import { useState } from 'react';
import { GenericButton } from '../buttons/generic-button';
import EditRentalPopUp from '../edit-rental-popup';
import { useLanguage } from "../../i18n/context";
import { localizeError } from "../../i18n/messages";

interface Rental {
  id: string;
  propertyId?: string;
  clientFirstName: string;
  clientLastName: string;
  startDate: string;
  endDate: string;
  revenue: number;
  fee: number;
  profit: number;
  isActive: boolean;
  createdAt?: string;
}

interface ModalProps {
  isOpen: boolean;
  rental: Rental | null;
  onClose: () => void;
  onDelete?: (id: string) => Promise<boolean> | boolean;
  onEditSubmit: (data: any) => Promise<boolean>;
  isSavingEdit: boolean;
  editError: any;
}

export default function RentalDetailPopUp({
  isOpen,
  rental,
  onClose,
  onDelete,
  onEditSubmit,
  isSavingEdit,
  editError,
}: ModalProps) {
  const {t,locale}=useLanguage();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Rental | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenEdit = (booking: Rental) => {
    setSelectedBooking(booking);
    setIsPopupOpen(true);
  };

  const handleCloseEdit = () => {
    setIsPopupOpen(false);
    setSelectedBooking(null);
  };

  if (!isOpen || !rental) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4">
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
          onClick={onClose}
        />

        <div className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto rf-dialog rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 md:rounded-[28px] md:zoom-in-95">
          <CloseButton onClose={onClose} />

          <RentalDetailHeader rental={rental} />

          <div className="space-y-8 p-8">
            <DetailGrid rental={rental} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {t("refId")}: {rental.id.slice(0, 8)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <GenericButton
                content={t("editBooking")}
                icon={<Edit3 size={18} />}
                onClick={() => handleOpenEdit(rental)}
                className="flex-1 py-4 bg-slate-900 text-white rounded-[24px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
              />

              <GenericButton
                content=""
                ariaLabel={t("deleteBooking")}
                icon={<Trash2 size={20} />}
                onClick={() => { setDeleteError(null); setPendingDeleteId(rental.id); }}
                className="w-16 h-14 bg-red-50 text-red-500 rounded-[24px] flex items-center justify-center hover:bg-red-100 transition-all active:scale-95 border border-red-100"
              />
            </div>

            {pendingDeleteId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
                  <h3 className="mb-2 text-lg font-bold text-slate-800">
                    {t("deleteRentalQuestion")}
                  </h3>
                  <p className="mb-6 text-sm text-slate-500">
                    {t("deleteCannotUndo")}
                  </p>

                  {deleteError && (
                    <p role="alert" className="mb-4 text-sm text-red-600">{localizeError(deleteError,locale,"couldNotDelete")}</p>
                  )}
                  <div className="flex gap-3">
                    <GenericButton
                      content={t("cancel")}
                      onClick={() => setPendingDeleteId(null)}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold"
                    />
                    <GenericButton
                      content={t("delete")}
                      onClick={async () => {
                        if (!onDelete || isDeleting) {
                          setDeleteError(t("couldNotDelete"));
                          return;
                        }
                        setIsDeleting(true);
                        try {
                          const deleted = await onDelete(pendingDeleteId);
                          if (!deleted) {
                            setDeleteError(t("couldNotDelete"));
                            return;
                          }
                          setPendingDeleteId(null);
                          onClose();
                        } catch {
                          setDeleteError(t("couldNotDelete"));
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditRentalPopUp
        isOpen={isPopupOpen}
        onClose={handleCloseEdit}
        onSubmit={onEditSubmit}
        isSaving={isSavingEdit}
        error={editError}
        rental={selectedBooking}
      />
    </>
  );
}