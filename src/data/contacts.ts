import type { GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

export interface Contact {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
}

// Helper function to get token from localStorage
const getToken = (): string | null => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("token");
    }
    return null;
};

// API functions for contacts
export async function getMany({
    paginationModel,
    filterModel,
    sortModel,
    signal,
    searchValue,
}: {
    paginationModel: GridPaginationModel;
    sortModel: GridSortModel;
    filterModel: GridFilterModel;
    signal?: AbortSignal;
    searchValue?: string;
}): Promise<{ items: Contact[]; itemCount: number }> {
    const token = getToken();

    // default fallback
    const page = paginationModel?.page ?? 0;
    const pageSize = paginationModel?.pageSize ?? 10;

    const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(pageSize),
    });

    const baseUrl = process.env.REMOTE_URL;
    // Add search parameter if provided and not empty
    if (searchValue && searchValue.trim().length > 0) {
        params.set("search", searchValue.trim());
    }


    try {
        // Use search endpoint if search value is provided, otherwise use getAllContacts
        const endpoint = searchValue && searchValue.trim().length > 0
            ? `${baseUrl}/searchContact.php?search=${encodeURIComponent(searchValue.trim())}`
            : `${baseUrl}/getAllContacts.php?${params.toString()}`;

        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            ...(signal && { signal }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // Handle different response formats
        let rawContacts = [];
        let totalCount = 0;

        if (searchValue && searchValue.trim().length > 0) {
            // Search endpoint response format
            if (result.error && result.error !== "") {
                throw new Error(result.error);
            }
            rawContacts = result.data || [];
            totalCount = rawContacts.length; // For search results, use actual count
        } else {
            // getAllContacts endpoint response format
            rawContacts = result.data || [];
            totalCount = result.totalCount || rawContacts.length;

            // If totalCount is not provided or is 0, but we have results, 
            // it might mean we're on the last page or there's an issue
            if (!totalCount || totalCount === 0) {
                // If we have fewer items than requested page size, we're on the last page
                if (rawContacts.length < pageSize) {
                    totalCount = (page - 1) * pageSize + rawContacts.length;
                } else {
                    // Estimate total count based on current page and items
                    totalCount = page * pageSize + 1; // Add 1 to indicate there might be more
                }
            }
        }

        // Transform the API response to match our Contact interface
        const contacts: Contact[] = rawContacts.map((contact: any) => ({
            id: parseInt(contact.contact_id),
            first_name: contact.firstName,
            last_name: contact.lastName,
            email: contact.email,
            phone: contact.phone,
        }));

        const response_data = {
            items: contacts,
            itemCount: totalCount,
        };

        return response_data;
    } catch (error) {
        throw new Error("Failed to fetch contacts");
    }
}


export async function getOne(contactId: number): Promise<Contact> {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REMOTE_URL;

    try {
        const response = await fetch(`${baseUrl}/getOneContact.php?contact_id=${contactId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });


        const result = await response.json();

        if (!result.data) {
            throw new Error('Contact not found');
        }

        // Transform the API response to match our Contact interface
        const rawContact = result.data;
        const contact: Contact = {
            id: parseInt(rawContact.contact_id),
            first_name: rawContact.firstName,
            last_name: rawContact.lastName,
            email: rawContact.email,
            phone: rawContact.phone,
        };

        return contact;
    } catch (error) {
        throw new Error('Failed to fetch contact');
    }
}

export async function createOne(data: Omit<Contact, 'id'>): Promise<Contact> {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REMOTE_URL;


    try {
        const response = await fetch(`${baseUrl}/addContact.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // send token in header instead of body
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error !== null) {
            throw new Error(result.error || 'Failed to create contact');
        }

        // Transform the API response to match our Contact interface
        const rawContact = result.data;
        const contact: Contact = {
            id: parseInt(rawContact.contact_id),
            first_name: rawContact.firstName,
            last_name: rawContact.lastName,
            email: rawContact.email,
            phone: rawContact.phone,
        };

        return contact;
    } catch (error) {
        throw new Error((error as Error).message || 'Failed to create contact');
    }
}


export async function updateOne(contactId: number, data: Partial<Omit<Contact, 'id'>>): Promise<Contact> {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REMOTE_URL;
    const jsonData = {
        contact_id: contactId,
        ...data,
    };

    try {
        const response = await fetch(`${baseUrl}/editContact.php`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error !== null && result.error !== "null") {
            throw new Error(result.error || 'Failed to update contact');
        }

        // Transform the API response to match our Contact interface
        const rawContact = result.data;
        const contact: Contact = {
            id: parseInt(rawContact.contact_id),
            first_name: rawContact.firstName,
            last_name: rawContact.lastName,
            email: rawContact.email,
            phone: rawContact.phone,
        };

        return contact;

    } catch (error) {
        throw new Error((error as Error).message || 'Failed to update contact');
    }
}

export async function deleteOne(contactId: number): Promise<void> {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REMOTE_URL;
    const jsonData = {
        contact_id: contactId,
    };

    try {
        const response = await fetch(`${baseUrl}/deleteContact.php`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(jsonData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (result.error !== null && result.error !== "null") {
            throw new Error(result.error || 'Failed to delete contact');
        }
    } catch (error) {
        throw new Error('Failed to delete contact');
    }
}

// Validation for contacts
type ValidationResult = { issues: { message: string; path: (keyof Contact)[] }[] };

export function validate(contact: Partial<Contact>): ValidationResult {
    let issues: ValidationResult['issues'] = [];

    if (!contact.first_name) {
        issues = [...issues, { message: 'First name is required', path: ['first_name'] }];
    }

    if (!contact.last_name) {
        issues = [...issues, { message: 'Last name is required', path: ['last_name'] }];
    }

    if (!contact.email) {
        issues = [...issues, { message: 'Email is required', path: ['email'] }];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        issues = [...issues, { message: 'Email format is invalid', path: ['email'] }];
    }

    if (!contact.phone) {
        issues = [...issues, { message: 'Phone is required', path: ['phone'] }];
    }

    return { issues };
}