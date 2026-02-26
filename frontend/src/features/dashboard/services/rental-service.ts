const baseUrl = "http://127.0.0.1:3000/" 

export const addRental = async (rentalData: any)=> {
    const response = await fetch(baseUrl + 'rental', {
    method: 'POST',
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


export const getNextThreeRentals = async() => {
  const response = await fetch('http://localhost:3000/all')

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to retrieve data on service');
  }

  const rentalsList: Promise<any[]> = await response.json()

  return await rentalsList
}


export const deleteRental = async(id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${baseUrl}rental/${id}`, {
      method: 'DELETE',
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