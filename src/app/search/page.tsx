"use client";

import React from 'react';
import { useState } from "react";
import SearchBar from "../components/SearchBar";

const partners: string[] = [ "Whole Foods", "Somerville Food Pantry", "Cambridge Community Center" ];

export default function SearchPage() {

    return (
        <div className="p-8 bg-white min-h-screen">
            {/* Page title */}
            <h1 className="text-2xl font-bold mb-4">Partner Search</h1>
            
            {/* SearchBar does all the work - just pass it the data */}
            <SearchBar organizations = {partners} />
        </div>
    );
}