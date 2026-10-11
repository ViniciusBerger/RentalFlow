import {csrfFetch} from '../../lib/csrf-fetch';
const baseUrl = import.meta.env.VITE_API_URL;

export const addRental = async (rentalData: any)=> {
    const response = await csrfFetch(`${baseUrl}/rental/add`, {
    method: 'POST',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
    },
    // The body must be a string, so we use JSON.stringify
    body: JSON.stringify(rentalData),
  })

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error: any = new Error(errorData?.message || "Unable to fetch session");
        error.status = response.status;
        throw error;
    }

    return response
}


export const deleteRental = async(id: string): Promise<boolean> => {
  try {
    const response = await csrfFetch(`${baseUrl}/rental/delete/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Include Authorization headers here if your API requires them
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error: any = new Error(errorData?.message || "Unable to fetch session");
      error.status = response.status;
      throw error;
    }

    // Based on documentation, the API returns a boolean
    const result = await response.json();
    return result === true;
    
  } catch (error) {
    console.error(`Error deleting rental ${id}:`, error);
    // Re-throw so the UI can catch it and show our "Summer Recovery" error state
    throw error;
  }
}

export const updateRental = async(id:string, toBeUpdated: any)=> {
    try {
      const response = await csrfFetch(`${baseUrl}/rental/update`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        },
      body: JSON.stringify({id: id, toBeUpdated: toBeUpdated})
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error: any = new Error(errorData?.message || "Unable to update rental");
      error.status = response.status;
      throw error;
    }

    const result = await response.json();
    return result === true;
    
  } catch (error) {
    console.error(`Error updating rental ${id}:`, error);
    throw error;
  }
}

export type BookingPriceQuote={
 baseCents:number;calculatedExtraCents:number;chargedExtraCents:number;
 totalCents:number;guests:number;nights:number;
};
export type BookingQuoteRequest={
 propertyId:string;startDate:string;endDate:string;guests:number;revenue:number;
 guestFee:{mode:'AUTOMATIC'}|{mode:'WAIVED';reason:string}|{mode:'ADJUSTED';cents:number;reason:string};
};
/** A review quote is calculated on the backend and never authorizes a booking by itself. */
export async function getBookingQuote(input:BookingQuoteRequest):Promise<BookingPriceQuote>{
 const response=await csrfFetch(baseUrl+'/rental/quote',{
  method:'POST',credentials:'include',cache:'no-store',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(input)
 });
 if(!response.ok){
  const payload:unknown=await response.json().catch(()=>null);
  const message=payload&&typeof payload==='object'&&'message' in payload
   ?String((payload as {message:unknown}).message):'Unable to obtain a rental price quote';
  throw new Error(message);
 }
 const payload:BookingPriceQuote=await response.json();
 if(!payload||!Number.isSafeInteger(payload.totalCents)||
   !Number.isSafeInteger(payload.chargedExtraCents)||
   !Number.isSafeInteger(payload.calculatedExtraCents)||
   !Number.isSafeInteger(payload.baseCents)||
   payload.totalCents<0||payload.chargedExtraCents<0)
  throw new Error('Invalid price quote response');
 return payload;
}
