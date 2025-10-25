"use client"; 

import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';

//main Admin Console Page
const AdminConsolePage: React.FC = () => {
    //mock partner data to pass to search bar for partner cards
    const partnerData = [
        { id: 1, name: "Whole Foods Market", location: "Cambridge", type: "Grocery Store" },
        { id: 2, name: "Somerville Food Pantry", location: "Somerville", type: "Food Pantry" },
        { id: 3, name: "Cambridge Community Center", location: "Cambridge", type: "Community Center" },
        { id: 4, name: "Boston Food Bank", location: "Boston", type: "Food Bank" },
        { id: 5, name: "Harvard Square Market", location: "Cambridge", type: "Market" },
        { id: 6, name: "MIT Community Garden", location: "Cambridge", type: "Garden" },
        { id: 7, name: "Central Square Grocery", location: "Cambridge", type: "Grocery Store" },
        { id: 8, name: "Porter Square Co-op", location: "Cambridge", type: "Cooperative" },
        { id: 9, name: "Davis Square Farmers Market", location: "Somerville", type: "Farmers Market" },
        { id: 10, name: "Union Square Market", location: "Somerville", type: "Market" },
        { id: 11, name: "Assembly Row Fresh Market", location: "Somerville", type: "Market" },
        { id: 12, name: "Kendall Square Kitchen", location: "Cambridge", type: "Kitchen" },
        { id: 13, name: "Arlington Food Cooperative", location: "Arlington", type: "Cooperative" },
        { id: 14, name: "Medford Community Kitchen", location: "Medford", type: "Kitchen" },
        { id: 15, name: "Malden Fresh Foods", location: "Malden", type: "Grocery Store" },
        { id: 16, name: "Everett Community Garden", location: "Everett", type: "Garden" },
        { id: 17, name: "Chelsea Food Hub", location: "Chelsea", type: "Food Hub" },
        { id: 18, name: "Revere Beach Market", location: "Revere", type: "Market" },
        { id: 19, name: "Lynn Community Center", location: "Lynn", type: "Community Center" },
        { id: 20, name: "Salem Organic Market", location: "Salem", type: "Market" }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-green-700">
                            Admin Console
                        </h1>
                        <div className="w-12 sm:w-16 h-1 bg-green-700"></div>
                    </div>

                    {/* Partner Record Section */}
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4 sm:mb-6">
                            Partner Record
                        </h2>
                        
                        {/* SearchBar component - handles everything */}
                        <SearchBar organizations={partnerData} />
                    </div>
                </div>
            </div> 
        </div>
    );
};

export default AdminConsolePage;