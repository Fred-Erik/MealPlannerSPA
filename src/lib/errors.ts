interface PostgrestLikeError {
  code?: string
  message?: string
}

/** Maps common PostgREST/Postgres error codes to a Dutch, user-facing message. */
export function toDutchErrorMessage(error: PostgrestLikeError | null | undefined): string {
  if (!error) return 'Er is een onbekende fout opgetreden.'

  switch (error.code) {
    case '23505':
      return 'Deze naam bestaat al.'
    case '23503':
      return 'Dit kan niet verwijderd worden omdat het nog wordt gebruikt.'
    case '23514':
      return 'De ingevoerde waarde voldoet niet aan de vereisten.'
    case 'PGRST301':
    case '401':
      return 'Je bent niet (meer) ingelogd. Log opnieuw in.'
    default:
      return error.message || 'Er is een onbekende fout opgetreden.'
  }
}
