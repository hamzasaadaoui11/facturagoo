
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Product, Quote, LineItem, QuoteStatus } from '../types';
import { X, Check, Eye, Save, Trash2, Plus, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateQuoteProps {
  clients: Client[];
  products: Product[];
  onAddQuote: (quote: Omit<Quote, 'id' | 'amount'>) => void;
  quotes?: Quote[];
  onUpdateQuote?: (quote: Quote) => void;
}

const CreateQuote: React.FC<CreateQuoteProps> = ({ clients, products, onAddQuote, quotes, onUpdateQuote }) => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(quoteId);
  const { t, isRTL } = useLanguage();

  const quoteToEdit = useMemo(() => {
    if (!isEditMode || !quotes) return null;
    return quotes.find(q => q.id === quoteId) || null;
  }, [quotes, quoteId, isEditMode]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // expiryDate removed from UI
  const [subject, setSubject] = useState('');
  const [reference, setReference] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: `line-${Date.now()}`, productId: null, productCode: '', name: '', description: '', quantity: 1, unitPrice: 0, vat: 20 },
  ]);

  // Prepare client list with display name priority (Company > Name)
  const clientOptions = useMemo(() => {
      return clients.map(c => ({
          ...c,
          displayName: c.company || c.name // PRIORITÉ SOCIÉTÉ
      })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [clients]);

  useEffect(() => {
    if (isEditMode && quoteToEdit) {
        setDate(quoteToEdit.date);
        setSubject(quoteToEdit.subject || '');
        setReference(quoteToEdit.reference || '');
        const client = clients.find(c => c.id === quoteToEdit.clientId);
        // Map the found client to include displayName for consistency
        const clientWithDisplay = client ? { ...client, displayName: client.company || client.name } : null;
        setSelectedClient(clientWithDisplay || null);
        setLineItems(quoteToEdit.lineItems);
    }
  }, [isEditMode, quoteToEdit, clients]);

  const addLineItem = () => {
    setLineItems([...lineItems, { id: `line-${Date.now()}`, productId: null, productCode: '', name: '', description: '', quantity: 1, unitPrice: 0, vat: 20 }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, ...updatedField } : item));
  };
  
  const handleProductSelect = (lineId: string, product: Product) => {
      updateLineItem(lineId, { 
          productId: product.id,
          productCode: product.productCode,
          name: product.name,
          description: product.description,
          unitPrice: product.salePrice,
          vat: product.vat,
      });
  };

  const totals = useMemo(() => {
    const subTotal = lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const vatAmount = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * item.vat / 100), 0);
    const total = subTotal + vatAmount;
    return { subTotal, vatAmount, total };
  }, [lineItems]);
  
    const handleSave = (status: QuoteStatus) => {
        if (!selectedClient) {
            alert(t('client'));
            return;
        }
        if (lineItems.length === 0 || lineItems.every(item => !item.name)) {
            alert(t('items'));
            return;
        }

        const clientNameDisplay = selectedClient.company || selectedClient.name;

        if (isEditMode && quoteToEdit && onUpdateQuote) {
            const updatedQuote: Quote = {
                ...quoteToEdit,
                clientId: selectedClient.id,
                clientName: clientNameDisplay,
                date,
                expiryDate: date, // Internal logic: same as date
                subject: subject || '',
                reference: reference || '',
                lineItems,
                subTotal: totals.subTotal,
                vatAmount: totals.vatAmount,
                amount: totals.total,
                status,
            };
            onUpdateQuote(updatedQuote);
        } else {
            const newQuote = {
                clientId: selectedClient.id,
                clientName: clientNameDisplay,
                date,
                expiryDate: date, // Internal logic
                subject: subject || '',
                reference: reference || '',
                lineItems,
                subTotal: totals.subTotal,
                vatAmount: totals.vatAmount,
                status,
            };
            onAddQuote(newQuote);
        }
        
        navigate('/sales/quotes');
    };
    
    const handlePreview = () => {
        alert("Preview");
    };

  // --- Components for Searchable Dropdowns ---

  const SearchableSelect = ({ items, selectedItem, onSelect, placeholder, displayField, addNewPath, addNewLabel }: any) => {
      const [searchTerm, setSearchTerm] = useState('');
      const [isOpen, setIsOpen] = useState(false);
      const wrapperRef = useRef<HTMLDivElement>(null);
      const dropdownRef = useRef<HTMLUListElement>(null);
      const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

      const updateDropdownPosition = () => {
          if (wrapperRef.current) {
              const rect = wrapperRef.current.getBoundingClientRect();
              setDropdownStyle({
                  top: `${rect.bottom + 4}px`,
                  left: `${rect.left}px`,
                  width: `${rect.width}px`,
              });
          }
      };

      const handleOpen = () => {
          setSearchTerm('');
          updateDropdownPosition();
          setIsOpen(true);
      };
      
      const handleClose = () => {
          setIsOpen(false);
      };

      const handleSelect = (item: any) => {
          onSelect(item);
          handleClose();
      };
      
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchTerm(e.target.value);
          if (!isOpen) {
              handleOpen();
          }
      };

      const handleInputClick = () => {
          if (isOpen) {
              handleClose();
          } else {
              handleOpen();
          }
      };

      useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isOpen &&
                wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                handleClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener('resize', updateDropdownPosition);
            window.addEventListener('scroll', updateDropdownPosition, true);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
        };
      }, [isOpen]);
      
      const filteredItems = items.filter((item: any) =>
          (item[displayField] || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const inputValue = isOpen ? searchTerm : (selectedItem ? selectedItem[displayField] : '');

      return (
          <div ref={wrapperRef} className="relative">
              <input 
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onClick={handleInputClick}
                  placeholder={placeholder}
                  className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              <div className={`absolute inset-y-0 flex items-center pointer-events-none ${isRTL ? 'left-0 pl-2' : 'right-0 pr-2'}`}>
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
              </div>
              {isOpen && createPortal(
                  <ul ref={dropdownRef} style={dropdownStyle} className="fixed z-50 max-h-60 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {addNewPath && (
                          <li onClick={() => { if(addNewPath) navigate(addNewPath); }} className="flex items-center gap-x-2 sticky top-0 bg-white cursor-pointer select-none py-2 pl-3 pr-9 text-emerald-600 hover:bg-emerald-50 border-b z-10">
                              <Plus size={16} />
                              <span className="block truncate font-semibold">{addNewLabel}</span>
                          </li>
                      )}
                      {items.length === 0 ? (
                          <li className="relative cursor-default select-none py-2 px-3 text-neutral-500">{t('search')}</li>
                      ) : filteredItems.length === 0 ? (
                          <li className="relative cursor-default select-none py-2 px-3 text-neutral-500">{t('search')}</li>
                      ) : (
                          filteredItems.map((item: any) => (
                              <li key={item.id} onMouseDown={() => handleSelect(item)} className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-neutral-900 hover:bg-neutral-100">
                                  <span className="block truncate">{item[displayField]}</span>
                              </li>
                          ))
                      )}
                  </ul>,
                  document.body
              )}
          </div>
      );
  };

  // --- Search or Free Text Input for Line Items ---
  
  const ItemNameInput = ({ value, products, onChange, onSelectProduct }: any) => {
      const [isOpen, setIsOpen] = useState(false);
      const wrapperRef = useRef<HTMLDivElement>(null);
      const dropdownRef = useRef<HTMLUListElement>(null);
      const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

      const updateDropdownPosition = () => {
          if (wrapperRef.current) {
              const rect = wrapperRef.current.getBoundingClientRect();
              setDropdownStyle({
                  top: `${rect.bottom + 4}px`,
                  left: `${rect.left}px`,
                  width: `${rect.width}px`,
              });
          }
      };

      const handleOpen = () => {
          updateDropdownPosition();
          setIsOpen(true);
      };

      const handleClose = () => setIsOpen(false);

      useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isOpen &&
                wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                handleClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener('resize', updateDropdownPosition);
            window.addEventListener('scroll', updateDropdownPosition, true);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
        };
      }, [isOpen]);

      // Filter products based on what user types
      const filteredProducts = products.filter((p: Product) => 
          p.name.toLowerCase().includes(value.toLowerCase())
      );

      return (
          <div ref={wrapperRef} className="relative">
              <input 
                  type="text" 
                  value={value} 
                  onChange={(e) => { onChange(e.target.value); if(!isOpen) handleOpen(); }}
                  onFocus={handleOpen}
                  className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  placeholder={t('description')}
              />
              {isOpen && filteredProducts.length > 0 && createPortal(
                  <ul ref={dropdownRef} style={dropdownStyle} className="fixed z-50 max-h-48 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <li className="px-3 py-1 text-xs text-neutral-400 font-semibold uppercase tracking-wider bg-neutral-50 sticky top-0">{t('products')}</li>
                      {filteredProducts.map((product: Product) => (
                          <li 
                            key={product.id} 
                            onMouseDown={() => { onSelectProduct(product); handleClose(); }}
                            className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-neutral-900 hover:bg-emerald-50"
                          >
                              <div className="flex justify-between">
                                <span className="font-medium truncate">{product.name}</span>
                                <span className="text-neutral-500 text-xs">{product.salePrice} MAD</span>
                              </div>
                          </li>
                      ))}
                  </ul>,
                  document.body
              )}
          </div>
      );
  };


  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-neutral-900">{isEditMode ? t('editQuote') : t('newQuote')}</h1>
            <p className="text-sm text-neutral-500 mt-1">{isEditMode ? `#${quoteToEdit?.id}` : t('createProposal')}</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/sales/quotes')} className="inline-flex items-center gap-x-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out">
                <X size={16} className="-ml-0.5" /> {t('cancel')}
            </button>
            <button onClick={() => handleSave(isEditMode ? quoteToEdit!.status : QuoteStatus.Draft)} className="inline-flex items-center gap-x-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out">
                <Save size={16} className="-ml-0.5" /> {t('save')}
            </button>
            <button onClick={handlePreview} className="inline-flex items-center gap-x-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out">
                <Eye size={16} className="-ml-0.5" /> {t('view')}
            </button>
            <button onClick={() => handleSave(isEditMode ? quoteToEdit!.status : QuoteStatus.Created)} className="inline-flex items-center gap-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out">
                <Check size={16} className="-ml-0.5" /> {t('validate')}
            </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-neutral-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 pb-6 border-b border-neutral-200">
            <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t('client')} *</label>
                 <SearchableSelect 
                    items={clientOptions}
                    selectedItem={selectedClient}
                    onSelect={setSelectedClient}
                    placeholder={t('client')}
                    displayField="displayName"
                    addNewPath="/clients"
                    addNewLabel={t('addClient')}
                />
            </div>
             <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('date')}</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"/>
                </div>
                {/* Expiry Date Removed */}
             </div>
             <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t('subject')}</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('subject')} className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t('reference')}</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder={t('reference')} className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"/>
            </div>
        </div>
        
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">{t('items')}</h3>
        <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
                <thead className="bg-neutral-50">
                    <tr>
                        <th className={`px-6 py-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider w-1/12 ${isRTL ? 'text-right' : 'text-left'}`}>{t('reference')}</th>
                        <th className={`px-3 py-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider w-4/12 ${isRTL ? 'text-right' : 'text-left'}`}>{t('description')}</th>
                        <th className={`px-3 py-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('quantity')}</th>
                        <th className={`px-3 py-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('unitPrice')}</th>
                        <th className={`px-3 py-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('vat')}</th>
                        <th className={`px-3 py-2 text-xs font-semibold text-neutral-600 uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('totalHT')}</th>
                        <th className="w-12 px-3 py-2"></th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                {lineItems.map(item => {
                    const lineTotal = item.quantity * item.unitPrice;
                    return (
                        <tr key={item.id} className="border-b border-neutral-200">
                            <td className="px-6 py-3 whitespace-nowrap">
                                <input 
                                    type="text" 
                                    value={item.productCode || ''} 
                                    onChange={e => updateLineItem(item.id, { productCode: e.target.value })} 
                                    placeholder={t('reference')}
                                    className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-gray-50"
                                />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                                <ItemNameInput 
                                    value={item.name} 
                                    products={products}
                                    onChange={(val: string) => updateLineItem(item.id, { name: val, productId: null })}
                                    onSelectProduct={(p: Product) => handleProductSelect(item.id, p)}
                                />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                                <input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 0 })} className="w-20 rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"/>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                                <input type="number" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="w-28 rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"/>
                            </td>
                             <td className="px-3 py-3 whitespace-nowrap">
                                <select value={item.vat} onChange={e => updateLineItem(item.id, { vat: parseInt(e.target.value) })} className="w-24 rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                    <option value="20">20%</option>
                                    <option value="14">14%</option>
                                    <option value="10">10%</option>
                                    <option value="7">7%</option>
                                    <option value="0">0%</option>
                                </select>
                            </td>
                            <td className={`px-3 py-3 whitespace-nowrap text-sm text-neutral-600 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>
                                {lineTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                                <button type="button" onClick={() => removeLineItem(item.id)} className="text-neutral-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
        
        <button type="button" onClick={addLineItem} className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            <Plus size={16} className={`mr-1 ${isRTL ? 'ml-1 mr-0' : ''}`}/> {t('addItem')}
        </button>

        <div className="flex justify-end mt-6">
            <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">{t('totalHT')}</span>
                    <span className="font-medium text-neutral-800">{totals.subTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">{t('vat')}</span>
                    <span className="font-medium text-neutral-800">{totals.vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                <hr className="my-2 border-neutral-200"/>
                <div className="flex justify-between font-bold text-lg">
                    <span className="text-neutral-900">{t('totalTTC')}</span>
                    <span className="text-emerald-600">{totals.total.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuote;
