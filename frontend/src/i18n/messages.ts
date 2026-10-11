/** User-facing strings. Keep keys identical in both locales to prevent silent fallbacks. */
export const en = {
  language: 'Language', portuguese: 'Português (Brasil)', english: 'English',
  workspace: 'Workspace', overview: 'Overview', bookings: 'Bookings',
  sidebarHeading: 'WORKSPACE', mainNavigation: 'Main navigation', mobileNavigation: 'Mobile navigation',
  workspaceTitle: 'Your workspace', workspaceCopy: 'All your bookings and financial results, together.', management: 'Management',
  bookingsAndCalendar: 'Bookings & calendar', manageStays: 'Manage reservations and upcoming stays.', businessAtGlance: 'Your rental business, at a glance.',
  newBooking: 'New booking', createBooking: 'Create a booking', createBookingShort: 'Create booking',
  dashboardHeading: 'FINANCIAL OVERVIEW', welcomeBack: 'Welcome back,', host: 'Host',
  dashboardDescription: 'Here is how your rentals are performing.', liveOverview: 'Live account overview',
  yearlyRevenue: 'Yearly revenue', yearlyProfit: 'Yearly profit', monthlyRevenue: 'Monthly revenue', monthlyProfit: 'Monthly profit',
  currentPeriod: 'Current period', financialSummary: 'Financial summary',
  monthlyInsights: 'Monthly rental insights', monthlyInsightsDescription: 'Active bookings by check-in month in the current year.',
  bookedNightsNotPayments: 'Amounts represent booked rental values, not confirmed payments.',
  rentalCount: 'Bookings', revenueChart: 'Revenue', profitChart: 'Profit',
  revenueTrendTitle: 'Revenue trend', revenueTrendDescription: 'Monthly booked revenue and reservations',
  currentYearLabel: 'Current year', secondaryAxis: 'right axis',
  strongestMonth: 'Busiest completed month', slowestMonth: 'Quietest completed month',
  noHistoryForInsights: 'Not enough completed-month booking history yet.',
  completedMonthsNote: 'Comparisons use completed months only. Current and future months are excluded from rankings.',
  upcomingGroup: 'Upcoming bookings', pastGroup: 'Past bookings', inProgressGroup: 'Stays in progress',
  noPastBookings: 'No past bookings yet.', noCurrentBookings: 'No stays in progress today.',
  seeAllBookings: 'All bookings',
  yourWorkspace: 'YOUR WORKSPACE', organized: 'Stay organized, effortlessly.',
  organizeDescription: 'Keep your upcoming reservations and rental finances in one place.', openCalendar: 'Open calendar',
  upcomingRentals: 'Upcoming rentals', nextRentals: 'Next Rentals', yourSchedule: 'YOUR SCHEDULE', viewCalendar: 'View calendar',
  noRentals: 'No upcoming rentals yet. Create a booking to get started.',
  booked: 'Booked', inactive: 'Inactive', guests: 'Guests', guestSingular: 'guest', guestPlural: 'guests',
  monthlyView: 'MONTHLY VIEW', previousMonth: 'Previous month', nextMonth: 'Next month',
  bookingManagement: 'RESERVATION MANAGEMENT', bookingCalendar: 'Booking calendar',
  bookingCalendarDescription: 'Select a reservation from the list to view or edit its details.', addBooking: 'Add booking',
  firstName: 'First name', lastName: 'Last name', email: 'Email address', password: 'Password',
  checkIn: 'Check In', checkOut: 'Check Out', totalRevenue: 'Total Revenue', totalFees: 'Total Fees',
  editRental: 'Edit Rental', editBooking: 'Edit Booking', deleteBooking: 'Delete booking',
  deleteRentalQuestion: 'Delete rental?', deleteCannotUndo: 'This action cannot be undone.',
  cancel: 'Cancel', delete: 'Delete', save: 'Save changes',
  couldNotDelete: 'Unable to delete booking. Please try again.',
  noChanges: 'No changes to save', updateFailed: 'Failed to update rental',
  confirmedStay: 'Confirmed Stay', awaitConfirmation: 'Await Confirmation',
  duration: 'Duration', nightSingular: 'night', nightPlural: 'nights',
  refId: 'Ref ID',
  signInWelcome: 'Welcome back', signInDescription: 'Enter your credentials to manage your stays.',
  signIn: 'Sign in', completeProfile: 'Complete profile', completeProfileDescription: 'Finish setting up your account to manage your stays.',
  continue: 'Continue', loading: 'Loading...',
  errorTitle: 'Something went wrong', loadErrorDescription: "We couldn't load your dashboard data. This might be a temporary connection issue.",
  technicalDetail: 'Technical Detail', tryAgain: 'Try Again', backToHome: 'Back to Home', close: 'Close', skipContent: 'Skip to content',
  profileNotLoaded: 'User profile could not be loaded.',
  genericError: 'Unable to complete this action. Please try again.',
  loginFailed: 'Login failed', invalidCredentials: 'Invalid credentials. Please check your email and password.',
  sessionExpired: 'Your session expired. Sign in again.',
  connectionError: 'Unable to connect to the service. Please try again.',
  bookingConflict: 'The selected dates are already booked.',
  validationError: 'Please check the entered information.',
  logoutFailed: 'Logout failed', profileFailed: 'Failed to complete profile',
  weekdaysFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weekdaysMobile: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
} as const;

export type MessageKey = Exclude<keyof typeof en, 'weekdaysFull' | 'weekdaysShort' | 'weekdaysMobile'>;
export type Locale = 'pt-BR' | 'en';
export const ptBR: Record<MessageKey, string> & {weekdaysFull: readonly string[]; weekdaysShort: readonly string[]; weekdaysMobile: readonly string[]} = {
  language: 'Idioma', portuguese: 'Português (Brasil)', english: 'English',
  workspace: 'Área de trabalho', overview: 'Visão geral', bookings: 'Reservas',
  sidebarHeading: 'ÁREA DE TRABALHO', mainNavigation: 'Navegação principal', mobileNavigation: 'Navegação móvel',
  workspaceTitle: 'Sua área de trabalho', workspaceCopy: 'Todas as reservas e resultados financeiros em um só lugar.', management: 'Gestão',
  bookingsAndCalendar: 'Reservas e calendário', manageStays: 'Gerencie suas reservas e próximas estadias.', businessAtGlance: 'Seu negócio de locação em um só lugar.',
  newBooking: 'Nova reserva', createBooking: 'Criar uma reserva', createBookingShort: 'Criar reserva',
  dashboardHeading: 'RESUMO FINANCEIRO', welcomeBack: 'Bem-vinda de volta,', host: 'anfitriã',
  dashboardDescription: 'Veja como estão os resultados das suas locações.', liveOverview: 'Resumo atualizado da sua conta',
  yearlyRevenue: 'Receita anual', yearlyProfit: 'Lucro anual', monthlyRevenue: 'Receita mensal', monthlyProfit: 'Lucro mensal',
  currentPeriod: 'Período atual', financialSummary: 'Resumo financeiro',
  monthlyInsights: 'Desempenho mensal das reservas', monthlyInsightsDescription: 'Reservas ativas por mês de entrada no ano atual.',
  bookedNightsNotPayments: 'Os valores representam reservas, não pagamentos recebidos.',
  rentalCount: 'Reservas', revenueChart: 'Receita', profitChart: 'Lucro',
  revenueTrendTitle: 'Tendência de receita', revenueTrendDescription: 'Receita reservada e quantidade de reservas por mês',
  currentYearLabel: 'Ano atual', secondaryAxis: 'eixo direito',
  strongestMonth: 'Mês completo com mais reservas', slowestMonth: 'Mês completo com menos reservas',
  noHistoryForInsights: 'Ainda não há histórico suficiente de meses completos.',
  completedMonthsNote: 'A comparação considera apenas meses completos. O mês atual e os futuros não entram no ranking.',
  upcomingGroup: 'Próximas reservas', pastGroup: 'Reservas anteriores', inProgressGroup: 'Estadias em andamento',
  noPastBookings: 'Nenhuma reserva anterior.', noCurrentBookings: 'Nenhuma estadia em andamento hoje.',
  seeAllBookings: 'Todas as reservas',
  yourWorkspace: 'SUA ÁREA DE TRABALHO', organized: 'Organize suas locações com facilidade.',
  organizeDescription: 'Acompanhe as próximas reservas e as finanças das suas locações em um só lugar.', openCalendar: 'Abrir calendário',
  upcomingRentals: 'Próximas reservas', nextRentals: 'Próximas reservas', yourSchedule: 'SUA AGENDA', viewCalendar: 'Ver calendário',
  noRentals: 'Nenhuma reserva futura. Crie uma reserva para começar.',
  booked: 'Reservada', inactive: 'Inativa', guests: 'Hóspedes', guestSingular: 'hóspede', guestPlural: 'hóspedes',
  monthlyView: 'VISÃO MENSAL', previousMonth: 'Mês anterior', nextMonth: 'Próximo mês',
  bookingManagement: 'GESTÃO DE RESERVAS', bookingCalendar: 'Calendário de reservas',
  bookingCalendarDescription: 'Selecione uma reserva na lista para ver ou editar os detalhes.', addBooking: 'Adicionar reserva',
  firstName: 'Nome', lastName: 'Sobrenome', email: 'E-mail', password: 'Senha',
  checkIn: 'Entrada', checkOut: 'Saída', totalRevenue: 'Receita total', totalFees: 'Custos totais',
  editRental: 'Editar reserva', editBooking: 'Editar reserva', deleteBooking: 'Excluir reserva',
  deleteRentalQuestion: 'Excluir reserva?', deleteCannotUndo: 'Esta ação não pode ser desfeita.',
  cancel: 'Cancelar', delete: 'Excluir', save: 'Salvar alterações',
  couldNotDelete: 'Não foi possível excluir a reserva. Tente novamente.',
  noChanges: 'Nenhuma alteração para salvar', updateFailed: 'Não foi possível atualizar a reserva',
  confirmedStay: 'Estadia confirmada', awaitConfirmation: 'Aguardando confirmação',
  duration: 'Duração', nightSingular: 'noite', nightPlural: 'noites',
  refId: 'ID da reserva',
  signInWelcome: 'Bem-vinda de volta', signInDescription: 'Entre com seu e-mail e senha para gerenciar suas locações.',
  signIn: 'Entrar', completeProfile: 'Complete seu cadastro', completeProfileDescription: 'Finalize seu cadastro para começar a gerenciar suas locações.',
  continue: 'Continuar', loading: 'Carregando...',
  errorTitle: 'Ocorreu um problema', loadErrorDescription: 'Não foi possível carregar os dados. Pode ser uma falha temporária de conexão.',
  technicalDetail: 'Detalhes do problema', tryAgain: 'Tentar novamente', backToHome: 'Voltar ao início', close: 'Fechar', skipContent: 'Ir para o conteúdo',
  profileNotLoaded: 'Não foi possível carregar seu perfil.',
  genericError: 'Não foi possível concluir esta ação. Tente novamente.',
  loginFailed: 'Não foi possível entrar', invalidCredentials: 'E-mail ou senha incorretos.',
  sessionExpired: 'Sua sessão expirou. Entre novamente.',
  connectionError: 'Não foi possível conectar ao serviço. Tente novamente.',
  bookingConflict: 'Já existe uma reserva para as datas selecionadas.',
  validationError: 'Confira as informações preenchidas.',
  logoutFailed: 'Não foi possível sair', profileFailed: 'Não foi possível concluir o cadastro',
  weekdaysFull: ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
  weekdaysShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  weekdaysMobile: ['D','S','T','Q','Q','S','S'],
};

export function translate(locale: Locale, key: MessageKey): string {
  return locale === 'pt-BR' ? ptBR[key] : en[key];
}

export function getWeekdays(locale: Locale) {
  const messages = locale === 'pt-BR' ? ptBR : en;
  return messages.weekdaysFull.map((full, i) => ({full, short: messages.weekdaysShort[i], mobile: messages.weekdaysMobile[i]}));
}

export function formatBRL(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Date-only bookings are calendar dates, never UTC instants; preserve their day in every timezone. */
export function formatBookingDate(input: string | Date | null | undefined, locale: Locale, monthOnly = false): string {
  if (!input) return '—';
  let date: Date;
  if (input instanceof Date) date = input;
  else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : new Date(input);
  }
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleDateString(locale, monthOnly ? {month:'long', year:'numeric'} : {day:'2-digit', month:'short', year:'numeric'});
}

/** Convert API month keys (YYYY-MM) to human-readable month labels. */
export function formatBalancePeriod(label: string | null | undefined, locale: Locale): string {
  if (!label) return translate(locale, 'currentPeriod');
  const matched = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(label);
  if (!matched) return label;
  return formatBookingDate(`${matched[1]}-${matched[2]}-01`,locale,true);
}

/** Keep backend English errors out of the pt-BR interface without exposing technical details. */
export function localizeError(error: unknown, locale: Locale, fallback: MessageKey = 'genericError'): string {
  const detail = typeof error === 'string' ? error : (error instanceof Error ? error.message : (
    error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
  ));
  if (locale === 'en') return detail || translate(locale, fallback);
  if (/invalid.*credential|incorrect.*password|unauthorized|wrong credential/i.test(detail)) return ptBR.invalidCredentials;
  if (/session.*expir|expired|token.*expir/i.test(detail)) return ptBR.sessionExpired;
  if (/already.*book|overlap|conflict|not available/i.test(detail)) return ptBR.bookingConflict;
  if (/fetch|network|ECONNREFUSED|connection|failed to connect/i.test(detail)) return ptBR.connectionError;
  if (/required|validat|invalid (?:date|input|value)|bad request/i.test(detail)) return ptBR.validationError;
  if (/no changes to save/i.test(detail)) return ptBR.noChanges;
  if (/update rental/i.test(detail)) return ptBR.updateFailed;
  if (/delete booking/i.test(detail)) return ptBR.couldNotDelete;
  if (/login failed|unable to login/i.test(detail)) return ptBR.loginFailed;
  if (/logout failed/i.test(detail)) return ptBR.logoutFailed;
  if (/complete profile/i.test(detail)) return ptBR.profileFailed;
  return ptBR[fallback];
}
