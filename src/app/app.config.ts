import { HttpClientModule } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';  // Asegúrate de que tus rutas estén definidas

export const appConfig = {
  providers: [
    HttpClientModule, // Proporciona HttpClientModule aquí
    provideHttpClient(), // Esto es necesario si quieres usar HttpClient
    provideRouter(routes), // Si tienes rutas, puedes agregarlas también
  ]
};
