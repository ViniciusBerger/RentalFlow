import { Main } from "./main";
import {ContractReadinessBanner} from "../contracts/readiness-banner";
import { useState } from "react";
import AddRentalPopUp from "../../components/add-rental-popup";
import { DashboardErrorState } from "../../components/error-state";
import RentalDetailPopUp from "../../components/rental-detail-popup";
import { useRentalActions } from "../../hooks/rental-actions/useRentalActions";
import { UseLoadData } from "../../hooks/load-data/useLoadData";
import { LoadingState } from "../../components/loading-state";
import { useProperties } from '../properties/property-store';
import { bookingMatches, calculatePropertyBalances } from '../properties/property-data';
import { PropertySelector } from '../properties/property-selector';
import { useLanguage } from "../../i18n/context";


export const Dashboard = () => {
  const {t}=useLanguage();
  const {selectedId,properties}=useProperties();
  const { balances, nextRentals, monthlySeries, isLoading, userData, loadData, refreshAfterMutation } = UseLoadData();
  const { isSaving, error: actionError, createRentalAndRefresh, deleteRentalAndRefresh, updateRentalAndRefresh } = // 
    useRentalActions(refreshAfterMutation);

  const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false);
  const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<any>(null);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<any>(null);

  const currentDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [year,month]=currentDay.split('-').map(Number);
  const selectedBalances=selectedId==='all'?null:calculatePropertyBalances(nextRentals,selectedId,year,month);
  const yearlyBalance = selectedBalances?.yearly??balances[0];
  const monthlyBalance = selectedBalances?.monthly??balances[1];

  const handleEditRental = async (formData: any) => {
    try {
      setIsSavingEdit(true);
      setEditError(null);

      if (!selectedRental?.id) return false;

      const updated = await updateRentalAndRefresh(selectedRental.id, formData);
      if (!updated) {
        setEditError(t("updateFailed"));
        return false;
      }
      setIsRentalDetailPopUpOpen(false);

      return true;
    } catch (err: any) {
      setEditError(err?.message || t("updateFailed"));
      return false;
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) return <LoadingState />;

  if (!userData) {
  return (
    <DashboardErrorState
      message={t("profileNotLoaded")}
      onRetry={() => {
        void loadData().catch(()=>{});
      }}
    />
  );
}

  return (
    <>
      <ContractReadinessBanner/>
      <div className="rf-dashboard-property-filter"><PropertySelector/></div>
      <Main
        onOpenCreateRentalPopUp={() => setIsCreateRentalPopUpOpen(true)}
        onSelectRental={(rental) => setSelectedRental(rental)}
        onOpenPopUp={() => setIsRentalDetailPopUpOpen(true)}
        props={{ yearly: yearlyBalance, monthly: monthlyBalance }}
        threeNextRentals={nextRentals.filter(r=>bookingMatches(r,selectedId)).map(r=>({...r,propertyName:properties.find(p=>p.id===r.propertyId)?.name,propertyColor:properties.find(p=>p.id===r.propertyId)?.color}))}
        monthlySeries={selectedBalances?.months??monthlySeries??[]}
        userData={userData}
      />

      <AddRentalPopUp
        isOpen={isCreateRentalPopUpOpen}
        onClose={() => setIsCreateRentalPopUpOpen(false)}
        onSubmit={createRentalAndRefresh}
        isSaving={isSaving}
        error={actionError}
      />

      <RentalDetailPopUp
        isOpen={isRentalDetailsPopUpOpen}
        onClose={() => setIsRentalDetailPopUpOpen(false)}
        rental={selectedRental}
        onDelete={deleteRentalAndRefresh}
        onEditSubmit={handleEditRental}
        isSavingEdit={isSavingEdit}
        editError={editError}
      />
    </>
  );
};