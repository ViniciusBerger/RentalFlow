export const login = async(email: string, password: string)=> {
  try{
    const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', 
    });

    if(!response.ok) throw new Error('invalid credentials')
    const JsonResponse = await response.json()
    console.log(JsonResponse)
    
    return JsonResponse
  
  } catch (error) {
      throw new Error('Invalid credentials');
  }
    

}

export const logout = async() => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Redirect the user to the login page
      window.location.href = '/auth'; 
    } catch (error) {
      console.error("Logout failed", error);
    }
}