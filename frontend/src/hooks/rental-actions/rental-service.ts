const baseUrl = "http://localhost:3000/rental/" 

export const addRental = async (rentalData: any)=> {
    const response = await fetch(baseUrl + 'add', {
    method: 'POST',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
    },
    // The body must be a string, so we use JSON.stringify
    body: JSON.stringify(rentalData),
  })

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create rental');
    }

    return response
}


export const getNextRentals = async() => {
  const response = await fetch(baseUrl + 'findall', {
    method: 'GET',
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to retrieve data on service');
  }

  const rentalsList: Promise<any[]> = await response.json()

  return await rentalsList
}


export const deleteRental = async(id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${baseUrl}delete/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Include Authorization headers here if your API requires them
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete rental');
    }

    // Based on your documentation, the API returns a boolean
    const result = await response.json();
    return result === true;
    
  } catch (error) {
    console.error(`Error deleting rental ${id}:`, error);
    // Re-throw so the UI can catch it and show our "Summer Recovery" error state
    throw error;
  }
}